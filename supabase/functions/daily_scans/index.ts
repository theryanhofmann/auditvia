import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Site {
  id: string
  url: string
  name: string | null
  user_id: string | null
}

interface ScanLog {
  site_id: string
  success: boolean
  message: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify this is a scheduled function call
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.includes('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'https://your-app-domain.com'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting daily scans job...')

    // Get all sites with monitoring enabled
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, url, name, user_id')
      .eq('monitoring', true)

    if (sitesError) {
      console.error('Error fetching monitored sites:', sitesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch monitored sites' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!sites || sites.length === 0) {
      console.log('No monitored sites found')
      return new Response(
        JSON.stringify({ 
          message: 'No monitored sites found',
          scanned: 0,
          successful: 0,
          failed: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${sites.length} monitored sites`)

    const scanLogs: ScanLog[] = []
    const results = {
      scanned: 0,
      successful: 0,
      failed: 0
    }

    // Process each site
    for (const site of sites as Site[]) {
      console.log(`Scanning site: ${site.url}`)
      
      try {
        // Call the scan API
        const scanResponse = await fetch(`${appUrl}/api/audit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-key': supabaseServiceKey,
          },
          body: JSON.stringify({
            url: site.url,
            siteId: site.id,
            userId: site.user_id
          })
        })

        const scanResult = await scanResponse.json()

        if (scanResponse.ok && scanResult.success) {
          console.log(`✅ Scan successful for ${site.url}: score ${scanResult.summary?.score}`)
          
          scanLogs.push({
            site_id: site.id,
            success: true,
            message: `Scan completed successfully. Score: ${scanResult.summary?.score}, Violations: ${scanResult.summary?.violations}`
          })
          
          results.successful++

          // Send daily summary email for successful scans
          try {
            const emailResponse = await fetch(`${appUrl}/api/email/daily-summary`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-service-key': supabaseServiceKey,
              },
              body: JSON.stringify({ siteId: site.id })
            })

            if (emailResponse.ok) {
              const emailResult = await emailResponse.json()
              console.log(`📧 Email summary sent for ${site.url}`, emailResult.dev ? '(dev mode)' : `to ${emailResult.sentTo}`)
            } else {
              console.error(`⚠️ Failed to send email summary for ${site.url}:`, await emailResponse.text())
            }
          } catch (emailError) {
            console.error(`⚠️ Email error for ${site.url}:`, emailError)
            // Don't fail the scan job if email fails
          }
        } else {
          console.error(`❌ Scan failed for ${site.url}:`, scanResult.error)
          
          scanLogs.push({
            site_id: site.id,
            success: false,
            message: `Scan failed: ${scanResult.error || 'Unknown error'}`
          })
          
          results.failed++
        }

        results.scanned++

        // Add delay between scans to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.error(`❌ Error scanning site ${site.url}:`, error)
        
        scanLogs.push({
          site_id: site.id,
          success: false,
          message: `Scan error: ${error.message || 'Network or server error'}`
        })
        
        results.failed++
        results.scanned++
      }
    }

    // Insert all scan logs
    if (scanLogs.length > 0) {
      const { error: logError } = await supabase
        .from('scan_logs')
        .insert(scanLogs)

      if (logError) {
        console.error('Error inserting scan logs:', logError)
        // Continue anyway, the scans were attempted
      } else {
        console.log(`✅ Inserted ${scanLogs.length} scan log entries`)
      }
    }

    const summary = {
      message: 'Daily scans completed',
      timestamp: new Date().toISOString(),
      sites_monitored: sites.length,
      ...results,
      logs_created: scanLogs.length
    }

    console.log('Daily scans job completed:', summary)

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Daily scans job error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 
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
  custom_domain: string | null
  user_id: string
}

interface ScanResult {
  siteId: string
  siteName: string
  siteUrl: string
  scannedUrl: string
  success: boolean
  scanId?: string
  score?: number
  violations?: number
  errorMessage?: string
  executionTime: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('🚀 Starting scheduled accessibility scans...')
    const startTime = Date.now()

    // Fetch all sites with monitoring enabled
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, url, name, custom_domain, user_id')
      .eq('monitoring', true)

    if (sitesError) {
      console.error('❌ Error fetching sites:', sitesError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch sites', 
          details: sitesError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!sites || sites.length === 0) {
      console.log('ℹ️ No sites with monitoring enabled found')
      return new Response(
        JSON.stringify({
          message: 'No sites with monitoring enabled found',
          timestamp: new Date().toISOString(),
          sitesScanned: 0,
          successfulScans: 0,
          failedScans: 0,
          executionTime: Date.now() - startTime
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`📊 Found ${sites.length} sites with monitoring enabled`)

    // Process each site
    const scanResults: ScanResult[] = []
    let successfulScans = 0
    let failedScans = 0

    for (const site of sites) {
      const siteStartTime = Date.now()
      console.log(`🔍 Scanning site: ${site.name || site.url} (${site.id})`)

      try {
        // Determine URL to scan (custom domain takes precedence)
        const urlToScan = site.custom_domain 
          ? `https://${site.custom_domain}`
          : site.url

        console.log(`📡 Scanning URL: ${urlToScan}`)

        // Call the audit API
        const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000'
        const auditResponse = await fetch(`${appUrl}/api/audit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-key': supabaseServiceKey
          },
          body: JSON.stringify({
            url: site.url, // Keep original URL for site reference
            siteId: site.id,
            userId: site.user_id
          })
        })

        const executionTime = Date.now() - siteStartTime

        if (!auditResponse.ok) {
          const errorText = await auditResponse.text()
          throw new Error(`Audit API failed: ${auditResponse.status} - ${errorText}`)
        }

        const auditData = await auditResponse.json()

        if (auditData.success) {
          console.log(`✅ Successfully scanned ${site.name || site.url} - Score: ${auditData.summary?.score || 'N/A'}`)
          
          const result: ScanResult = {
            siteId: site.id,
            siteName: site.name || new URL(site.url).hostname,
            siteUrl: site.url,
            scannedUrl: urlToScan,
            success: true,
            scanId: auditData.data?.scan?.id,
            score: auditData.summary?.score,
            violations: auditData.summary?.violations,
            executionTime
          }
          
          scanResults.push(result)
          successfulScans++

          // Log success to scheduled_scan_logs
          await supabase
            .from('scheduled_scan_logs')
            .insert({
              site_id: site.id,
              scan_id: auditData.data?.scan?.id,
              status: 'success',
              scanned_url: urlToScan,
              execution_time_ms: executionTime
            })

        } else {
          throw new Error(auditData.error || 'Audit failed without specific error')
        }

      } catch (error) {
        const executionTime = Date.now() - siteStartTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        console.error(`❌ Failed to scan ${site.name || site.url}:`, errorMessage)
        
        const result: ScanResult = {
          siteId: site.id,
          siteName: site.name || new URL(site.url).hostname,
          siteUrl: site.url,
          scannedUrl: site.custom_domain ? `https://${site.custom_domain}` : site.url,
          success: false,
          errorMessage,
          executionTime
        }
        
        scanResults.push(result)
        failedScans++

        // Log failure to scheduled_scan_logs
        await supabase
          .from('scheduled_scan_logs')
          .insert({
            site_id: site.id,
            status: 'failure',
            scanned_url: site.custom_domain ? `https://${site.custom_domain}` : site.url,
            error_message: errorMessage,
            execution_time_ms: executionTime
          })
      }
    }

    const totalExecutionTime = Date.now() - startTime
    const averageScore = scanResults
      .filter(r => r.success && r.score !== undefined)
      .reduce((sum, r) => sum + (r.score || 0), 0) / Math.max(successfulScans, 1)

    console.log(`🎯 Scheduled scan complete!`)
    console.log(`📈 Results: ${successfulScans} successful, ${failedScans} failed out of ${sites.length} total`)
    console.log(`⏱️ Total execution time: ${totalExecutionTime}ms`)

    // TODO: Future enhancement - Send email notifications for failed scans or low scores
    // TODO: Future enhancement - Send dashboard notifications for new scan results
    // TODO: Future enhancement - Integrate with alerting system for critical issues

    const response = {
      message: 'Scheduled accessibility scans completed',
      timestamp: new Date().toISOString(),
      sitesScanned: sites.length,
      successfulScans,
      failedScans,
      averageScore: Math.round(averageScore),
      totalExecutionTime,
      results: scanResults
    }

    return new Response(
      JSON.stringify(response, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Critical error in scheduled scans:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 
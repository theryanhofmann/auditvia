import { createClient } from 'npm:@supabase/supabase-js'
import { runA11yScan } from './scan.ts'

interface Site {
  id: string
  url: string
  team_id: string
  monitoring_frequency: string
}

interface ScanViolation {
  id: string
  impact: string
  description: string
  helpUrl: string
  html: string
  target: string[]
}

interface ScanResult {
  score: number
  totalViolations: number
  violations: ScanViolation[]
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

Deno.serve(async (_req) => {
  try {
    // Get sites due for monitoring
    const { data: sites, error: sitesError } = await supabase
      .rpc('get_sites_due_for_monitoring')

    if (sitesError) {
      throw new Error(`Failed to get sites: ${sitesError.message}`)
    }

    if (!sites?.length) {
      return new Response(
        JSON.stringify({ message: 'No sites due for monitoring' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Process each site
    const results = await Promise.allSettled(
      sites.map(async (site: Site) => {
        try {
          // Run scan
          const scan = await runA11yScan(site.url)

          // Create scan record
          const { data: scanRecord, error: scanError } = await supabase
            .from('scans')
            .insert({
              site_id: site.id,
              status: 'completed',
              score: scan.score,
              total_issues: scan.totalViolations
            })
            .select()
            .single()

          if (scanError) throw scanError

          // Store issues
          if (scan.violations.length > 0) {
            const { error: issuesError } = await supabase
              .from('issues')
              .insert(
                scan.violations.map((v: ScanViolation) => ({
                  scan_id: scanRecord.id,
                  rule: v.id,
                  impact: v.impact,
                  description: v.description,
                  help_url: v.helpUrl,
                  html: v.html,
                  selector: v.target.join(', ')
                }))
              )

            if (issuesError) throw issuesError
          }

          // Update monitoring schedule
          const { error: updateError } = await supabase
            .from('sites')
            .update({
              last_monitored_at: new Date().toISOString()
            })
            .eq('id', site.id)

          if (updateError) throw updateError

          return {
            siteId: site.id,
            status: 'success',
            scanId: scanRecord.id
          }
        } catch (error: unknown) {
          console.error(`Error processing site ${site.id}:`, error)
          return {
            siteId: site.id,
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
          }
        }
      })
    )

    return new Response(
      JSON.stringify({
        message: 'Monitoring completed',
        results
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error('Error in monitoring function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 
import { serve } from "std/http/server.ts"
import { createClient, SupabaseClient, PostgrestError } from "@supabase/supabase-js"

const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || ['http://localhost:3000']

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Site {
  id: string
  url: string
  name: string | null
  user_id: string | null
  monitoring: boolean
}

interface ScanResult {
  site_id: string
  site_url: string
  site_name: string | null
  success: boolean
  scan_id?: string
  score?: number
  violations?: number
  message: string
  duration?: number
  error?: string
}

interface MonitoringSummary {
  message: string
  timestamp: string
  total_sites_monitored: number
  total_attempted: number
  total_successful: number
  total_failed: number
  average_score?: number
  total_violations?: number
  execution_time_seconds: number
  results: ScanResult[]
}

interface AuditResponse {
  success: boolean
  scanId?: string
  summary?: {
    score: number
    violations: number
  }
  error?: string
}

// Helper function for retrying database operations
async function retryDatabaseOperation<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<{ data: T | null; error: PostgrestError | null }> {
  let lastError: PostgrestError | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (!result.error) {
        return result;
      }
      lastError = result.error;
      console.log(`Attempt ${attempt}/${maxRetries} failed:`, result.error);
      
      if (attempt < maxRetries) {
        const jitter = Math.random() * 200;
        const delay = delayMs * Math.pow(2, attempt - 1) + jitter;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (err) {
      // Convert unknown error to PostgrestError format
      lastError = {
        message: err instanceof Error ? err.message : String(err),
        details: '',
        hint: '',
        code: 'UNKNOWN_ERROR'
      };
      console.log(`Attempt ${attempt}/${maxRetries} failed with exception:`, err);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  return { data: null, error: lastError };
}

serve(async (req: Request) => {
  const startTime = Date.now()
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting scheduled monitoring job...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000'

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    console.log('📋 Fetching sites with monitoring enabled...')
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, url, name, user_id, monitoring')
      .eq('monitoring', true)

    if (sitesError) {
      console.error('❌ Error fetching monitored sites:', sitesError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch monitored sites',
          details: sitesError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!sites || sites.length === 0) {
      console.log('ℹ️ No monitored sites found')
      const summary: MonitoringSummary = {
        message: 'No sites with monitoring enabled found',
        timestamp: new Date().toISOString(),
        total_sites_monitored: 0,
        total_attempted: 0,
        total_successful: 0,
        total_failed: 0,
        execution_time_seconds: Math.round((Date.now() - startTime) / 1000),
        results: []
      }
      
      return new Response(
        JSON.stringify(summary),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🎯 Found ${sites.length} monitored sites`)

    const results: ScanResult[] = []
    let totalScore = 0
    let totalViolations = 0
    let successfulScans = 0

    for (const site of sites) {
      const siteStartTime = Date.now()
      console.log(`🔍 Starting scan for: ${site.url} (${site.name || 'Unnamed'})`)
      
      try {
        const response = await fetch(`${appUrl}/api/audit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-key': supabaseServiceKey,
          },
          body: JSON.stringify({
            url: site.url,
            siteId: site.id,
            userId: site.user_id || undefined
          })
        })

        const auditResult = await response.json() as AuditResponse
        const siteDuration = Math.round((Date.now() - siteStartTime) / 1000)

        if (response.ok && auditResult.success) {
          const score = auditResult.summary?.score || 0
          const violations = auditResult.summary?.violations || 0
          
          console.log(`✅ Scan successful for ${site.url}: Score ${score}, Violations ${violations}`)
          
          results.push({
            site_id: site.id,
            site_url: site.url,
            site_name: site.name,
            success: true,
            scan_id: auditResult.scanId,
            score,
            violations,
            message: `Scan completed successfully. Score: ${score}/100, Violations: ${violations}`,
            duration: siteDuration
          })
          
          totalScore += score
          totalViolations += violations
          successfulScans++

          await retryDatabaseOperation(async () => {
            const { error } = await supabase
              .from('monitoring_logs')
              .insert({
                site_id: site.id,
                scan_id: auditResult.scanId,
                success: true,
                score,
                violations,
                message: `Automated scan completed successfully`,
                created_at: new Date().toISOString()
              })
            return { data: null, error }
          })

        } else {
          const errorMessage = auditResult.error || 'Unknown audit error'
          console.error(`❌ Scan failed for ${site.url}:`, errorMessage)
          
          results.push({
            site_id: site.id,
            site_url: site.url,
            site_name: site.name,
            success: false,
            message: `Scan failed: ${errorMessage}`,
            duration: siteDuration,
            error: errorMessage
          })

          await retryDatabaseOperation(async () => {
            const { error } = await supabase
              .from('monitoring_logs')
              .insert({
                site_id: site.id,
                success: false,
                message: `Automated scan failed: ${errorMessage}`,
                error: errorMessage,
                created_at: new Date().toISOString()
              })
            return { data: null, error }
          })
        }

      } catch (error) {
        const siteDuration = Math.round((Date.now() - siteStartTime) / 1000)
        const errorMessage = error instanceof Error ? error.message : 'Network or server error'
        console.error(`❌ Error scanning site ${site.url}:`, error)
        
        results.push({
          site_id: site.id,
          site_url: site.url,
          site_name: site.name,
          success: false,
          message: `Scan error: ${errorMessage}`,
          duration: siteDuration,
          error: errorMessage
        })

        try {
          await retryDatabaseOperation(async () => {
            const { error } = await supabase
              .from('monitoring_logs')
              .insert({
                site_id: site.id,
                success: false,
                message: `Automated scan error: ${errorMessage}`,
                error: errorMessage,
                created_at: new Date().toISOString()
              })
            return { data: null, error }
          })
        } catch (logError) {
          console.error(`⚠️ Critical error logging failure for ${site.url}:`, logError)
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const totalAttempted = results.length
    const totalSuccessful = results.filter(r => r.success).length
    const totalFailed = results.filter(r => !r.success).length
    const averageScore = successfulScans > 0 ? Math.round(totalScore / successfulScans) : undefined
    const executionTime = Math.round((Date.now() - startTime) / 1000)

    const summary: MonitoringSummary = {
      message: 'Scheduled monitoring completed',
      timestamp: new Date().toISOString(),
      total_sites_monitored: sites.length,
      total_attempted: totalAttempted,
      total_successful: totalSuccessful,
      total_failed: totalFailed,
      average_score: averageScore,
      total_violations: totalViolations,
      execution_time_seconds: executionTime,
      results
    }

    console.log('🎉 Scheduled monitoring job completed:', {
      sites_monitored: sites.length,
      successful: totalSuccessful,
      failed: totalFailed,
      average_score: averageScore,
      total_violations: totalViolations,
      execution_time: `${executionTime}s`
    })

    try {
      await retryDatabaseOperation(async () => {
        const { error } = await supabase
          .from('monitoring_summary_logs')
          .insert({
            sites_monitored: sites.length,
            successful_scans: totalSuccessful,
            failed_scans: totalFailed,
            average_score: averageScore,
            total_violations: totalViolations,
            execution_time_seconds: executionTime,
            created_at: new Date().toISOString()
          })
        return { data: null, error }
      })
    } catch (summaryError) {
      console.error('⚠️ Error logging monitoring summary:', summaryError)
    }

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const executionTime = Math.round((Date.now() - startTime) / 1000)
    console.error('💥 Scheduled monitoring job error:', error)
    
    const errorSummary = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      execution_time_seconds: executionTime
    }
    
    return new Response(
      JSON.stringify(errorSummary),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 
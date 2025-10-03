import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'
import { verifyScanOwnership } from '@/app/lib/ownership'
import { ScanRunningPage } from './ScanRunningPage'
import { ScanFailedPage } from './ScanFailedPage'
import { SchemaErrorPage } from './SchemaErrorPage'
import { scanAnalytics } from '@/lib/safe-analytics'
import { getSchemaCapabilities } from '@/lib/schema-capabilities'
import { EnterpriseReportClient } from './EnterpriseReportClient'

interface RouteParams {
  params: Promise<{ scanId: string }>
}

interface ScanWithSite {
  id: string
  sites: {
    id: string
    name: string
    url: string
    team_id: string
    monitoring_enabled: boolean
  }
}

// Force dynamic rendering - never cache this page
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ScanReportPage({ params: paramsPromise }: RouteParams) {
  const params = await paramsPromise
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    notFound()
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get scan with site details (robust error handling for schema issues)
  console.log(`🔍 [report-loader start] Fetching scan: ${params.scanId} for user: ${userId}`)
  
  // Step 1: Get the scan with capability-aware query
  let scan: any = null
  let scanError: any = null
  let isSchemaError = false
  
  // Try up to 3 times with short delays to handle read-after-write race conditions
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Build dynamic select query based on available columns
      const baseColumns = `
        id,
        status,
        started_at,
        finished_at,
        created_at,
        site_id,
        user_id,
        total_violations,
        passes,
        incomplete,
        inapplicable,
        scan_time_ms,
        updated_at,
        platform,
        platform_confidence,
        platform_detected_from,
        scan_metadata
      `

      const lifecycleColumns = `
        ended_at,
        last_activity_at,
        progress_message,
        heartbeat_interval_seconds,
        max_runtime_minutes,
        error_message
      `

      // Check if we can query lifecycle columns (they should exist after migration)
      let selectQuery = baseColumns
      try {
        const capabilities = await getSchemaCapabilities()
        if (capabilities.hasEndedAt && capabilities.hasLastActivityAt && capabilities.hasProgressMessage) {
          selectQuery += `, ${lifecycleColumns}`
        }
      } catch (error) {
        // If capabilities check fails, stick with base columns
        console.debug(`🔍 [report] Capabilities check failed, using base columns:`, error)
      }

      const result = await supabase
        .from('scans')
        .select(selectQuery)
        .eq('id', params.scanId)
        .single()
      
      scan = result.data
      scanError = result.error
      
      if (scan) {
        console.log(`🔍 [query OK] Scan found on attempt ${attempt}: ${scan.id}, status: ${scan.status}`)
        break
      }
      
    } catch (error: any) {
      console.error(`🔍 [report] Query error on attempt ${attempt}:`, error)
      scanError = error
    }
    
    // Check if this is a DB schema error (42703 = column does not exist, PGRST204 = schema cache issue)
    if (scanError?.code === '42703' || 
        scanError?.code === 'PGRST204' ||
        scanError?.message?.includes('column') || 
        scanError?.message?.includes('does not exist') ||
        scanError?.message?.includes('schema cache')) {
      console.error(`🔍 [schema error fatal] DB schema/cache error detected:`, {
        code: scanError.code,
        message: scanError.message,
        scanId: params.scanId
      })
      isSchemaError = true
      break
    }
    
    if (attempt < 3) {
      console.log(`🔍 [report] ⏳ Scan not found on attempt ${attempt}, retrying...`)
      await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay
    }
  }

  // Handle schema errors with clear guidance
  if (isSchemaError) {
    console.error(`🔍 [schema error fatal] Cannot proceed due to database schema/cache issue`)
    return <SchemaErrorPage errorCode={scanError?.code || '42703'} />
  }

  if (scanError || !scan) {
    console.error(`❌ [report] Scan not found after 3 attempts:`, scanError)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <h1 className="text-4xl font-bold mb-4">Scan Not Found</h1>
        <p className="text-xl mb-8">We couldn&apos;t find the requested scan report.</p>
        <a href="/dashboard" className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Back to Dashboard
        </a>
      </div>
    )
  }

  // Step 2: Get the site details (handle case where site_id might be null due to schema errors)
  let site: any = null
  let siteError: any = null
  
  if (scan.site_id) {
    const result = await supabase
      .from('sites')
      .select('id, name, url, team_id, monitoring_enabled, repository_mode')
      .eq('id', scan.site_id)
      .single()
    
    site = result.data
    siteError = result.error
  }

  if (!site && scan.status === 'running') {
    // If we can't get site info but scan is running, create a placeholder
    // The polling will eventually get the real data
    console.warn(`🔍 [report] ⚠️ Site not found for running scan ${scan.id}, using placeholder`)
    
    site = {
      id: scan.site_id || 'unknown',
      name: 'Loading...',
      url: 'https://loading...',
      team_id: null, // Will be populated on next poll/refresh
      monitoring_enabled: false
    }
    
    console.log(`🔍 [report] Placeholder site created - team_id will be loaded on refresh`)
  } else if (siteError || !site) {
    console.error(`❌ [report] Site not found for scan ${scan.id}:`, siteError)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <h1 className="text-4xl font-bold mb-4">Scan Not Found</h1>
        <p className="text-xl mb-8">Site information could not be loaded for this scan.</p>
        <a href="/dashboard" className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Back to Dashboard
        </a>
      </div>
    )
  }

  // Step 3: Get the issues (violations) with GitHub issue links
  const { data: issues, error: issuesError } = await supabase
    .from('issues')
    .select('id, rule, selector, severity, impact, description, help_url, html, github_issue_url, github_issue_number')
    .eq('scan_id', scan.id)
    .order('impact', { ascending: false })

  console.log(`🔍 [report] Issues query result:`, { 
    issuesFound: issues?.length || 0, 
    scanId: scan.id,
    error: issuesError?.message || null 
  })

  if (issuesError) {
    console.warn(`⚠️ [report] Could not load issues for scan ${scan.id}:`, issuesError)
  }

  // Combine the data
  const combinedScan = {
    ...scan,
    sites: [site],
    issues: issues || []
  }

  console.log(`🔍 [report] Combined scan result:`, { 
    scanFound: !!combinedScan, 
    scanId: combinedScan?.id, 
    status: combinedScan?.status,
    siteFound: !!site,
    teamId: site?.team_id,
    issuesCount: combinedScan?.issues?.length || 0
  })

  // (Demo mode and type assertions removed - no longer needed)

  // Verify user has access to this scan using centralized ownership helper
  // Skip ownership check for running scans with placeholder data (will be checked on next poll)
  if (scan.status !== 'running' || site.team_id !== 'unknown') {
    const ownershipResult = await verifyScanOwnership(userId, params.scanId, '🔍 [report]')
    
    if (!ownershipResult.allowed) {
      console.error(`❌ [report] User ${userId} attempted to access scan ${params.scanId}: ${ownershipResult.error?.message}`)
      notFound()
    }

    console.log(`🔍 [report] ✅ Scan ownership verified - user has role: ${ownershipResult.role}`)
  } else {
    console.log(`🔍 [report] ⏳ Skipping ownership check for running scan with placeholder data`)
  }

  // Handle different scan statuses with explicit logging
  console.log(`🔍 [report] Checking scan status: ${combinedScan.status}`)
  
  // Structured logging for report state transitions
  const reportMetadata = {
    scanId: combinedScan.id,
    status: combinedScan.status,
    siteId: combinedScan.site_id,
    userId,
    timestamp: new Date().toISOString()
  }
  // Safe analytics logging
  scanAnalytics.reportViewed(
    combinedScan.id, 
    combinedScan.status, 
    combinedScan.site_id, 
    userId, 
    reportMetadata
  )
  
  // Handle running/queued scans
  if (combinedScan.status === 'running' || combinedScan.status === 'queued') {
    console.log(`🔍 [status=running] Showing progress screen for scan: ${combinedScan.id}`)
    
    // Extract screenshot from scan_metadata if available
    const screenshot = combinedScan.scan_metadata?.screenshot
    
    return (
      <ScanRunningPage 
        scanId={combinedScan.id} 
        siteUrl={combinedScan.sites[0]?.url || ''} 
        siteName={combinedScan.sites[0]?.name}
        siteScreenshot={screenshot}
        createdAt={combinedScan.created_at}
        lastActivityAt={combinedScan.last_activity_at} // Don't provide fallback - let component detect legacy mode
        progressMessage={combinedScan.progress_message || 'Scanning in progress...'}
        maxRuntimeMinutes={combinedScan.max_runtime_minutes || 15}
        heartbeatIntervalSeconds={combinedScan.heartbeat_interval_seconds || 30}
        userId={userId}
      />
    )
  }
  
  // Handle failed scans  
  if (combinedScan.status === 'failed') {
    // Fetch error message separately to avoid cache issues
    let errorMessage = null
    // Try to fetch error message, but don't fail if column doesn't exist
    try {
      const { data: errorData, error: errorQueryError } = await supabase
        .from('scans')
        .select('error_message')
        .eq('id', combinedScan.id)
        .single()
      
      if (!errorQueryError) {
        errorMessage = errorData?.error_message
      } else if (errorQueryError.code === '42703') {
        console.debug(`🔍 [report] error_message column not available in legacy schema`)
        errorMessage = 'Scan failed - error details not available in legacy mode'
      }
    } catch (error) {
      console.warn(`🔍 [report] Could not fetch error message for failed scan: ${combinedScan.id}`)
      errorMessage = 'Scan failed - error details unavailable'
    }
    
    console.log(`🔍 [status=failed] Showing failure screen for scan: ${combinedScan.id}, error: ${errorMessage || 'No error message'}`)
    return (
      <ScanFailedPage 
        scanId={combinedScan.id} 
        siteId={combinedScan.site_id} 
        siteUrl={combinedScan.sites[0]?.url || ''} 
        siteName={combinedScan.sites[0]?.name}
        errorMessage={errorMessage || undefined}
        createdAt={combinedScan.created_at}
      />
    )
  }

  // Only proceed if scan is completed
  if (combinedScan.status !== 'completed') {
    console.error(`❌ [report] Unexpected scan status: ${combinedScan.status}`)
    notFound()
  }

  console.log(`🔍 [status=completed] Rendering full report for scan: ${combinedScan.id}`)

  // Transform scan data to match expected type
  const scanData = {
    id: combinedScan.id,
    status: combinedScan.status,
    started_at: combinedScan.started_at,
    finished_at: combinedScan.finished_at,
    created_at: combinedScan.created_at,
    site_id: combinedScan.site_id,
    total_violations: combinedScan.total_violations ?? 0,
    passes: combinedScan.passes ?? 0,
    incomplete: combinedScan.incomplete ?? 0,
    inapplicable: combinedScan.inapplicable ?? 0,
    sites: combinedScan.sites[0],
    issues: combinedScan.issues || []
  }

  // Calculate score
  const totalTests = scanData.passes + scanData.total_violations + scanData.incomplete + scanData.inapplicable
  const successfulTests = scanData.passes + scanData.inapplicable
  const score = totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : null

  // (Removed unused groupedIssues and impactColors variables)

  // Use the new Enterprise Report design
  console.log('🎯 [ScanReportPage] Rendering EnterpriseReportClient for scan:', {
    scanId: scan.id,
    siteId: site.id,
    siteName: site.name,
    issueCount: issues?.length || 0,
    score,
    status: 'completed'
  })

  return (
    <EnterpriseReportClient
      scan={{
        id: scan.id,
        created_at: scan.created_at,
        platform: scan.platform,
        platform_confidence: scan.platform_confidence,
        platform_detected_from: scan.platform_detected_from
      }}
      site={{
        id: site.id,
        name: site.name,
        url: site.url,
        team_id: site.team_id,
        monitoring_enabled: site.monitoring_enabled || false
      }}
      issues={issues || []}
      score={score}
    />
  )
} 
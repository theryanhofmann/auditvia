import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'
import { ScoreCircle } from '@/app/components/ui/ScoreCircle'
import { ViolationAccordion } from '@/app/components/ui/ViolationAccordion'
import { UpgradeCTAClient } from './UpgradeCTAClient'
import { MonitoringStatus } from '@/app/components/ui/MonitoringStatus'
import { verifyScanOwnership } from '@/app/lib/ownership'
import { ScanRunningPage } from './ScanRunningPage'
import { ScanFailedPage } from './ScanFailedPage'
import { SchemaErrorPage } from './SchemaErrorPage'
import { PDFExportCard } from '@/app/components/ui/PDFExportButton'
import { scanAnalytics } from '@/lib/safe-analytics'
import { getSchemaCapabilities } from '@/lib/schema-capabilities'

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
  let isLegacyMode = false
  
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
        updated_at
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
      .select('id, name, url, team_id, monitoring_enabled')
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
      team_id: 'unknown',
      monitoring_enabled: false
    }
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

  // Step 3: Get the issues (violations)
  const { data: issues, error: issuesError } = await supabase
    .from('issues')
    .select('id, rule, selector, severity, impact, description, help_url, html')
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

  // Check if we're in demo mode to show the badge
  const isAuditDevMode = process.env.AUDIT_DEV_MODE === 'true'

  // Type assertion since we know the structure from our query
  const typedScan = {
    id: combinedScan.id,
    sites: combinedScan.sites[0]
  } as ScanWithSite

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
    return (
      <ScanRunningPage 
        scanId={combinedScan.id} 
        siteUrl={combinedScan.sites[0]?.url || ''} 
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

  // Group issues by impact
  const groupedIssues = scanData.issues.reduce((acc: Record<string, any[]>, issue: any) => {
    const impact = issue.impact || 'minor'
    if (!acc[impact]) acc[impact] = []
    acc[impact].push(issue)
    return acc
  }, {} as Record<string, any[]>)

  // Impact color mapping
  const impactColors = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    serious: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
    moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    minor: 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-200'
  }

  async function exportReport() {
    // This will be implemented in the client component
    console.log('Export report')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Score Overview */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {scanData.sites.name || new URL(scanData.sites.url).hostname}
                </h1>
                {isAuditDevMode && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                    Demo Data
                  </span>
                )}
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Scan completed on {new Date(scanData.created_at).toLocaleDateString()} at {new Date(scanData.created_at).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex-shrink-0">
              <ScoreCircle score={score} size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      <UpgradeCTAClient scanId={scanData.id} />

      {/* PDF Export */}
      <PDFExportCard 
        scanId={scanData.id} 
        siteName={scanData.sites.name || new URL(scanData.sites.url).hostname}
      />

      {/* Monitoring Status */}
      <MonitoringStatus 
        monitoringEnabled={scanData.sites.monitoring_enabled || false}
        lastScannedAt={scanData.created_at}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Passes</h3>
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{scanData.passes}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Successful checks</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Violations</h3>
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{scanData.total_violations}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Failed accessibility checks</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Incomplete</h3>
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{scanData.incomplete}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Checks requiring review</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-500 dark:text-gray-400">Inapplicable</h3>
            <div className="p-2 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">{scanData.inapplicable}</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tests not applicable</p>
        </div>
      </div>

      {/* Issues Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Accessibility Issues</h2>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {scanData.total_violations} {scanData.total_violations === 1 ? 'issue requires' : 'issues require'} attention
            </p>
          </div>
          <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-6">
              {Object.entries(groupedIssues).map(([impact, issues]) => (
                <div key={impact} className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${
                    impact === 'critical' ? 'bg-red-500' :
                    impact === 'serious' ? 'bg-orange-500' :
                    impact === 'moderate' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {impact.charAt(0).toUpperCase() + impact.slice(1)}: {(issues as any[]).length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Object.entries(groupedIssues).map(([impact, issues]) => (
            <div key={impact} className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 capitalize">
                {impact} Issues
              </h3>
              <div className="space-y-4">
                {(issues as any[]).map((issue: any) => (
                  <ViolationAccordion
                    key={issue.id}
                    rule={issue.rule}
                    description={issue.description}
                    impact={impact as 'critical' | 'serious' | 'moderate' | 'minor'}
                    selector={issue.selector}
                    html={issue.html}
                    help_url={issue.help_url}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {scanData.total_violations === 0 && scanData.incomplete === 0 && (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Perfect Score!</h3>
            <p className="text-gray-600 dark:text-gray-400">No accessibility issues were found. Keep up the great work!</p>
          </div>
        )}
      </div>
    </div>
  )
} 
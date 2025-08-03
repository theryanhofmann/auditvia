import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { createClient } from '@/app/lib/supabase/server'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { ScoreCircle } from '@/app/components/ui/ScoreCircle'
import { ViolationAccordion } from '@/app/components/ui/ViolationAccordion'
import { UpgradeCTAClient } from './UpgradeCTAClient'
import { MonitoringStatus } from '@/app/components/ui/MonitoringStatus'

interface RouteParams {
  params: Promise<{ scanId: string }>
}

interface ScanWithSite {
  id: string
  sites: {
    id: string
    name: string
    url: string
    user_id: string
  }
}

export default async function ScanReportPage({ params: paramsPromise }: RouteParams) {
  const params = await paramsPromise
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    notFound()
  }

  const supabase = await createClient()

  // Get scan with site details
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select(`
      id,
      status,
      started_at,
      finished_at,
      created_at,
      site_id,
      total_violations,
      passes,
      incomplete,
      inapplicable,
      sites!inner (
        id,
        name,
        url,
        user_id,
        monitoring_enabled
      ),
      issues (
        id,
        rule,
        selector,
        severity,
        impact,
        description,
        help_url,
        html
      )
    `)
    .eq('id', params.scanId)
    .single()

  if (scanError || !scan) {
    if (scanError && !scanError.message?.includes('JSON object requested')) {
      console.error('Error fetching scan:', scanError)
    }
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

  // Type assertion since we know the structure from our query
  const typedScan = {
    id: scan.id,
    sites: scan.sites[0]
  } as ScanWithSite

  // Verify site belongs to the authenticated user
  if (typedScan.sites?.user_id !== userId) {
    console.warn(`User ${userId} attempted to access scan for site owned by ${typedScan.sites?.user_id}`)
    notFound()
  }

  // Verify scan is completed
  if (scan.status !== 'completed') {
    console.warn(`Attempted to view incomplete scan ${scan.id} with status ${scan.status}`)
    notFound()
  }

  // Transform scan data to match expected type
  const scanData = {
    id: scan.id,
    status: scan.status,
    started_at: scan.started_at,
    finished_at: scan.finished_at,
    created_at: scan.created_at,
    site_id: scan.site_id,
    total_violations: scan.total_violations ?? 0,
    passes: scan.passes ?? 0,
    incomplete: scan.incomplete ?? 0,
    inapplicable: scan.inapplicable ?? 0,
    sites: scan.sites[0],
    issues: scan.issues || []
  }

  // Calculate score
  const totalTests = scanData.passes + scanData.total_violations + scanData.incomplete + scanData.inapplicable
  const successfulTests = scanData.passes + scanData.inapplicable
  const score = totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : null

  // Group issues by impact
  const groupedIssues = scanData.issues.reduce((acc, issue) => {
    const impact = issue.impact || 'minor'
    if (!acc[impact]) acc[impact] = []
    acc[impact].push(issue)
    return acc
  }, {} as Record<string, typeof scanData.issues>)

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
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                {scanData.sites.name || new URL(scanData.sites.url).hostname}
              </h1>
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
                    {impact.charAt(0).toUpperCase() + impact.slice(1)}: {issues.length}
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
                {issues.map(issue => (
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

        {scanData.issues.length === 0 && (
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
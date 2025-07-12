import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { ShareButton } from '@/app/components/ui/ShareButton'
import { ScoreBadge } from '@/app/components/ui/ScoreBadge'
import { IssueList } from '@/app/components/ui/IssueList'
import { GlobeIcon, ClockIcon } from 'lucide-react'

interface Props {
  params: {
    scanId: string
  }
}

// Metadata generation for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()
  const { data: scan } = await supabase
    .from('scans')
    .select('url, total_violations, created_at')
    .eq('id', params.scanId)
    .single()

  if (!scan) {
    return {
      title: 'Scan Report Not Found - Auditvia',
      description: 'The requested accessibility scan report could not be found.'
    }
  }

  const domain = new URL(scan.url).hostname
  const violations = scan.total_violations || 0
  const date = new Date(scan.created_at).toLocaleDateString()
  const violationText = violations === 1 ? 'issue' : 'issues'

  return {
    title: `Accessibility Report for ${domain} - ${violations} ${violationText} found - Auditvia`,
    description: `View the detailed accessibility audit report for ${domain}. Scanned on ${date} with ${violations} accessibility ${violationText}. Powered by Auditvia.`,
    openGraph: {
      title: `Accessibility Report for ${domain}`,
      description: `View the detailed accessibility audit report for ${domain}. Scanned on ${date} with ${violations} accessibility ${violationText}.`,
      type: 'article',
      url: `${process.env.NEXT_PUBLIC_APP_URL}/report/${params.scanId}`,
    },
    twitter: {
      card: 'summary',
      title: `Accessibility Report for ${domain}`,
      description: `View the detailed accessibility audit report for ${domain}. Found ${violations} accessibility ${violationText}.`,
    },
  }
}

// Fetch scan data from Supabase
async function getScanById(scanId: string) {
  const supabase = await createClient()
  
  const { data: scan, error } = await supabase
    .from('scans')
    .select(`
      id,
      url,
      total_violations,
      passes,
      incomplete,
      inapplicable,
      created_at,
      report_data,
      sites (
        name,
        custom_domain
      )
    `)
    .eq('id', scanId)
    .single()

  if (error || !scan) {
    return null
  }

  return scan
}

export default async function ReportPage({ params }: Props) {
  const scan = await getScanById(params.scanId)

  // Return 404 if scan not found
  if (!scan) {
    notFound()
  }

  // Return 404 if scan has no report data (incomplete)
  if (!scan.report_data) {
    notFound()
  }

  const domain = new URL(scan.url).hostname
  const displayName = scan.sites?.[0]?.name || domain
  const scanDate = new Date(scan.created_at)
  const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/report/${params.scanId}`

  // Extract issues from report data
  const issues = scan.report_data.violations.map((violation: any) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node: any) => ({
      html: node.html,
      target: node.target
    }))
  }))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {displayName}
                </h1>
                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <GlobeIcon className="h-4 w-4" />
                    <span>{domain}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    <time dateTime={scan.created_at}>
                      {scanDate.toLocaleDateString()} at {scanDate.toLocaleTimeString()}
                    </time>
                  </div>
                </div>
              </div>
              <ShareButton url={reportUrl} />
            </div>

            {/* Scan Summary */}
            <div className="mt-6 flex items-center gap-4">
              <ScoreBadge totalViolations={scan.total_violations || 0} size="lg" />
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  Scan Results
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {scan.passes || 0} passes, {scan.incomplete || 0} incomplete, {scan.inapplicable || 0} inapplicable
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Issues List */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Accessibility Issues
          </h2>
          <IssueList issues={issues} />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            This accessibility report was generated by{' '}
            <a
              href={process.env.NEXT_PUBLIC_APP_URL}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Auditvia
            </a>
          </p>
        </div>
      </div>
    </div>
  )
} 
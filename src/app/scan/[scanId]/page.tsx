import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/app/lib/supabase/server"
import { getOrCreateUser } from "@/lib/supabase/user"
import { format } from "date-fns"
import { Badge } from "@/app/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, AlertCircle, Code, Link as LinkIcon } from "lucide-react"

export const metadata: Metadata = {
  title: "Scan Details",
  description: "View detailed scan results and accessibility issues",
}

interface ScanWithDetails {
  id: string
  site_id: string
  score: number | null
  status: string
  created_at: string
  site: {
    name: string | null
    url: string
  } | null
  issues: Array<{
    id: number
    rule: string
    severity: 'critical' | 'serious' | 'moderate' | 'minor'
    impact: 'critical' | 'serious' | 'moderate' | 'minor' | null
    description: string | null
    help_url: string | null
    html: string | null
    selector: string
  }>
}

interface RawScanResponse {
  id: string
  site_id: string
  score: number | null
  status: string
  created_at: string
  site: {
    name: string | null
    url: string
    user_id: string
  }
  issues: Array<{
    id: number
    rule: string
    severity: string
    impact: string | null
    description: string | null
    help_url: string | null
    html: string | null
    selector: string
  }>
}

async function getScanDetails(scanId: string, userId: string): Promise<ScanWithDetails> {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Fetching scan details:', { scanId, userId })
  }

  const supabase = await createClient()

  try {
    // Get or create Supabase user
    const supabaseUserId = await getOrCreateUser(userId)

    if (process.env.NODE_ENV === 'development') {
      console.log('👤 Resolved Supabase user:', supabaseUserId)
    }

    // Fetch scan with site details and issues
    const { data: scanData, error } = await supabase
      .from('scans')
      .select(`
        id,
        site_id,
        score,
        status,
        created_at,
        site:sites!inner (
          name,
          url,
          user_id
        ),
        issues (
          id,
          rule,
          severity,
          impact,
          description,
          help_url,
          html,
          selector
        )
      `)
      .eq('id', scanId)
      .single()

    if (error) {
      console.error('Error fetching scan:', error)
      throw new Error('Failed to fetch scan details')
    }

    if (!scanData) {
      throw notFound()
    }

    const rawScan = scanData as unknown as RawScanResponse

    // Verify ownership
    if (rawScan.site.user_id !== supabaseUserId) {
      console.error('Access denied:', { siteUserId: rawScan.site.user_id, requestUserId: supabaseUserId })
      throw new Error('Access denied')
    }

    // Transform the response to match our expected types
    const scan: ScanWithDetails = {
      id: rawScan.id,
      site_id: rawScan.site_id,
      score: rawScan.score,
      status: rawScan.status,
      created_at: rawScan.created_at,
      site: {
        name: rawScan.site.name,
        url: rawScan.site.url
      },
      issues: rawScan.issues.map(issue => ({
        id: issue.id,
        rule: issue.rule,
        severity: issue.severity as 'critical' | 'serious' | 'moderate' | 'minor',
        impact: issue.impact as 'critical' | 'serious' | 'moderate' | 'minor' | null,
        description: issue.description,
        help_url: issue.help_url,
        html: issue.html,
        selector: issue.selector
      }))
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Scan details:', {
        id: scan.id,
        score: scan.score,
        issuesCount: scan.issues.length
      })
    }

    return scan
  } catch (error) {
    console.error('Error in getScanDetails:', error)
    throw error
  }
}

function getScoreColor(score: number | null) {
  if (!score) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
  if (score >= 90) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
  if (score >= 70) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
  if (score >= 50) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
}

function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case 'critical':
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
    case 'serious':
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
    case 'moderate':
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
    case 'minor':
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
  }
}

function groupIssuesBySeverity(issues: ScanWithDetails['issues']) {
  const groups = {
    critical: [] as typeof issues,
    serious: [] as typeof issues,
    moderate: [] as typeof issues,
    minor: [] as typeof issues
  }

  issues.forEach(issue => {
    const severity = issue.severity.toLowerCase() as keyof typeof groups
    if (severity in groups) {
      groups[severity].push(issue)
    }
  })

  return groups
}

export default async function ScanDetailsPage({
  params,
}: {
  params: { scanId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/api/auth/signin")
  }

  try {
    const scan = await getScanDetails(params.scanId, session.user.id)
    const issueGroups = groupIssuesBySeverity(scan.issues)

    return (
      <div className="container py-10">
        {/* Back Button */}
        <Link
          href={`/dashboard/sites/${scan.site_id}/history`}
          className="inline-flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Scan History</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Scan Results
            </h1>
            <div className="flex items-center space-x-3">
              <Badge className={getScoreColor(scan.score)}>
                Score: {scan.score !== null ? `${scan.score}/100` : 'N/A'}
              </Badge>
              <Badge variant="outline">
                {scan.issues.length} {scan.issues.length === 1 ? 'issue' : 'issues'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center space-x-2">
              <LinkIcon className="w-4 h-4" />
              <a
                href={scan.site?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {scan.site?.name || scan.site?.url}
              </a>
            </div>
            <div>
              Scanned {format(new Date(scan.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        </div>

        {/* Issue Groups */}
        <div className="space-y-8">
          {Object.entries(issueGroups).map(([severity, issues]) => {
            if (issues.length === 0) return null

            return (
              <div key={severity} className="space-y-4">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 capitalize">
                  {severity} Issues ({issues.length})
                </h2>

                <div className="space-y-4">
                  {issues.map(issue => (
                    <div
                      key={issue.id}
                      className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
                    >
                      {/* Issue Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-1">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {issue.rule}
                          </div>
                          {issue.description && (
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">
                              {issue.description}
                            </div>
                          )}
                        </div>
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity}
                        </Badge>
                      </div>

                      {/* Code Snippet */}
                      {issue.html && (
                        <div className="mb-4">
                          <div className="flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                            <Code className="w-4 h-4" />
                            <span>HTML Snippet</span>
                          </div>
                          <pre className="bg-zinc-50 dark:bg-zinc-800/50 rounded-md p-3 text-sm font-mono overflow-x-auto">
                            {issue.html}
                          </pre>
                        </div>
                      )}

                      {/* Selector */}
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        <div className="font-medium mb-1">Selector:</div>
                        <code className="bg-zinc-50 dark:bg-zinc-800/50 rounded px-1.5 py-0.5 text-xs">
                          {issue.selector}
                        </code>
                      </div>

                      {/* Help Link */}
                      {issue.help_url && (
                        <div className="mt-4 text-sm">
                          <a
                            href={issue.help_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            Learn more about this issue
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Empty State */}
          {scan.issues.length === 0 && (
            <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                No Issues Found
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Great job! This page meets all accessibility requirements.
              </p>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      redirect("/dashboard")
    }
    throw error
  }
} 
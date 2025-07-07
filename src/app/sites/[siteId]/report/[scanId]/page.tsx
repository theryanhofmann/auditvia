import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, AlertCircle, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { Navigation } from '@/app/components/Navigation'
import { StatsCard } from '@/app/components/dashboard/StatsCard'
import { createClient } from '@/app/lib/supabase/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { IssueTable } from './IssueTable'

interface PageProps {
  params: Promise<{
    siteId: string
    scanId: string
  }>
}

export default async function SiteReportPage({ params }: PageProps) {
  const { siteId, scanId } = await params
  
  // Get session (but allow anonymous access)
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null

  const supabase = await createClient()

  // Fetch site data - allow both authenticated user sites and anonymous sites
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, name, url, user_id')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    notFound()
  }

  // If site belongs to a user, ensure current user has access
  if (site.user_id && site.user_id !== userId) {
    notFound()
  }

  // Fetch scan data with issues
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select(`
      id,
      score,
      status,
      created_at,
      finished_at,
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
    .eq('id', scanId)
    .eq('site_id', siteId)
    .single()

  if (scanError || !scan) {
    notFound()
  }

  // Calculate statistics
  const totalIssues = scan.issues?.length || 0
  const severeIssues = scan.issues?.filter(issue => 
    issue.severity === 'critical' || issue.severity === 'serious'
  ).length || 0

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-50 dark:bg-green-900/20'
    if (score >= 70) return 'bg-blue-50 dark:bg-blue-900/20'
    if (score >= 50) return 'bg-yellow-50 dark:bg-yellow-900/20'
    return 'bg-red-50 dark:bg-red-900/20'
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Accessibility Report
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-zinc-600 dark:text-zinc-400">
                  {site.name || site.url} • {format(new Date(scan.created_at), 'MMMM dd, yyyy')}
                </p>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-blue-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            
            <div className={`px-6 py-3 rounded-lg ${getScoreBg(scan.score || 0)}`}>
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(scan.score || 0)}`}>
                  {scan.score || 0}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Accessibility Score
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Accessibility Score"
            value={`${scan.score || 0}/100`}
            description="Overall compliance rating"
            valueColor={getScoreColor(scan.score || 0)}
            icon={CheckCircle}
          />
          <StatsCard
            title="Total Issues"
            value={totalIssues}
            description="Accessibility violations found"
            icon={AlertCircle}
          />
          <StatsCard
            title="Severe Issues"
            value={severeIssues}
            description="Critical and serious violations"
            valueColor={severeIssues > 0 ? 'text-red-600 dark:text-red-400' : undefined}
            icon={XCircle}
          />
        </div>

        {/* Issues Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Accessibility Issues
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {totalIssues} {totalIssues === 1 ? 'issue' : 'issues'} found
            </p>
          </div>
          
          <IssueTable issues={scan.issues || []} />
        </div>
      </div>
    </div>
  )
} 
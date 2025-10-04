'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { 
  CheckCircle, 
  XCircle, 
  
  Download,
  
  
  
  Globe,
  Link as LinkIcon,
  ArrowLeftRight,
  Users,
  Activity
} from 'lucide-react'
import { Switch } from '@/app/components/ui/switch'
import { toast } from 'react-hot-toast'
import { useSession } from 'next-auth/react'
import { useTeam } from '@/app/context/TeamContext'
import { AISuggestionsPanel } from '@/app/components/scan/AISuggestionsPanel'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { useRouter } from 'next/navigation'
import { EnterpriseGateModal, SAMPLE_REPORT_ANCHOR } from '@/app/components/ui/EnterpriseGateModal'
import { EnterpriseGateBanner } from '@/app/components/scans/EnterpriseGateBanner'
import { isEnterpriseGatingEnabled, isScanProfilesEnabled } from '@/lib/feature-flags'

interface Issue {
  id: string
  rule: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help_url: string
  html: string
  selector: string
  instances?: Array<any>
}

interface ViolationCardProps extends Issue {
  expanded: boolean
  onToggle: () => void
}

interface Scan {
  id: string
  site_id: string
  team_id: string
  status: string
  started_at: string
  finished_at: string | null
  total_violations: number
  passes: number
  incomplete: number
  inapplicable: number
  public: boolean
  issues: Issue[]
  sites: {
    id: string
    name: string | null
    url: string
  }
}

interface ScanReportClientProps {
  scan: Scan
}

function IssueCard({
  id: _id,
  rule,
  impact,
  description,
  help_url,
  html,
  selector,
  instances: _instances,
  expanded,
  onToggle
}: ViolationCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{rule}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={impact === 'critical' ? 'destructive' : 'secondary'}>
            {impact}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {expanded ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Selector</h4>
            <code className="text-sm bg-secondary/50 px-2 py-1 rounded">
              {selector}
            </code>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-1">HTML</h4>
            <pre className="text-sm bg-secondary/50 p-2 rounded overflow-x-auto">
              {html}
            </pre>
          </div>
          <div>
            <a
              href={help_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Learn more about this issue
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export function ScanReportClient({ scan }: ScanReportClientProps) {
  const { data: session } = useSession()
  const { teamId, loading: teamLoading } = useTeam()
  const [isPublic, setIsPublic] = useState(scan.public)
  const [isUpdating, setIsUpdating] = useState(false)
  const [issues, setIssues] = useState<Issue[]>([])
  const [_isLoading, setIsLoading] = useState(true)
  const [_error, setError] = useState<string | null>(null)
  const [expandedIssues, setExpandedIssues] = useState<string[]>([])
  const [previousScan, setPreviousScan] = useState<string | null>(null)
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false)
  const router = useRouter()

  // Validate team access
  useEffect(() => {
    if (!teamLoading && teamId !== scan.team_id) {
      router.push('/dashboard')
      toast.error('You do not have access to this scan')
    }
  }, [teamId, scan.team_id, teamLoading, router])

  // Trigger enterprise gate modal on incomplete_enterprise_gate status
  // Require BOTH feature flags
  useEffect(() => {
    if (
      isEnterpriseGatingEnabled() &&
      isScanProfilesEnabled() &&
      scan.status === 'incomplete_enterprise_gate'
    ) {
      setShowEnterpriseModal(true)
    }
  }, [scan.status])

  // Calculate accessibility score treating inapplicable as passes
  const calculateScore = (data: typeof scan) => {
    const totalTests = data.passes + data.total_violations + data.incomplete + data.inapplicable
    if (totalTests === 0) return null

    // Treat inapplicable as successful tests
    const successfulTests = data.passes + data.inapplicable
    const score = Math.round((successfulTests / totalTests) * 100)
    return Math.max(0, Math.min(100, score))
  }

  const fetchIssues = useCallback(async () => {
    if (!teamId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/scans/${scan.id}/issues?teamId=${teamId}`)
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have access to this scan')
        }
        throw new Error('Failed to fetch scan issues')
      }

      const data = await response.json()
      setIssues(data.issues || [])
    } catch (err) {
      console.error('Error fetching issues:', err)
      setError(err instanceof Error ? err.message : 'Failed to load scan issues')
      if (err instanceof Error && err.message === 'You do not have access to this scan') {
        router.push('/dashboard')
      }
    } finally {
      setIsLoading(false)
    }
  }, [scan.id, teamId, router])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  // Fetch previous scan
  useEffect(() => {
    const fetchPreviousScan = async () => {
      if (!teamId) return

      try {
        const response = await fetch(`/api/sites/${scan.site_id}/scans?teamId=${teamId}&limit=2`)
        if (!response.ok) {
          throw new Error('Failed to fetch scans')
        }
        const data = await response.json()
        const scans = data.scans || []
        // Find the previous scan (not the current one)
        const previous = scans.find((s: { id: string }) => s.id !== scan.id)
        if (previous) {
          setPreviousScan(previous.id)
        }
      } catch (error) {
        console.error('Error fetching previous scan:', error)
      }
    }
    fetchPreviousScan()
  }, [scan.site_id, scan.id, teamId])

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-500'
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number | null) => {
    if (score === null) return 'bg-gray-50 dark:bg-gray-900'
    if (score >= 90) return 'bg-green-50 dark:bg-green-900/20'
    if (score >= 70) return 'bg-blue-50 dark:bg-blue-900/20'
    if (score >= 50) return 'bg-yellow-50 dark:bg-yellow-900/20'
    return 'bg-red-50 dark:bg-red-900/20'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800'
      case 'serious':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800'
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800'
      case 'minor':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800'
    }
  }

  const toggleIssue = (id: string) => {
    setExpandedIssues(prev =>
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  // Check if we should show enterprise banner and sample section
  const showEnterpriseBanner =
    isEnterpriseGatingEnabled() &&
    isScanProfilesEnabled() &&
    scan.status === 'incomplete_enterprise_gate'

  // For sample report, show top 20-50 issues using existing priority logic
  const sampleIssues = showEnterpriseBanner
    ? issues.slice(0, Math.min(50, issues.length))
    : issues

  // Group issues by impact (use sampleIssues if showing partial results)
  const issuesToShow = showEnterpriseBanner ? sampleIssues : issues
  const groupedIssues = issuesToShow.reduce((acc, issue) => {
    const impact = issue.impact
    if (!acc[impact]) {
      acc[impact] = []
    }
    acc[impact].push(issue)
    return acc
  }, {} as Record<Issue['impact'], Issue[]>)

  // Sort issues by impact severity
  const severityOrder = {
    critical: 0,
    serious: 1,
    moderate: 2,
    minor: 3
  } as const

  type SeverityType = keyof typeof severityOrder

  const sortedIssues = Object.entries(groupedIssues)
    .sort(([a], [b]) => {
      const aOrder = severityOrder[a as SeverityType] ?? 4
      const bOrder = severityOrder[b as SeverityType] ?? 4
      return aOrder - bOrder
    }) as [Issue['impact'], Issue[]][]

  const _copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const exportReport = () => {
    const reportData = {
      scan: {
        id: scan.id,
        score: calculateScore(scan),
        status: scan.status,
        created_at: new Date().toISOString(), // Placeholder, actual created_at is not available in this scan object
        site: scan.sites
      },
      issues,
      generated_at: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accessibility-report-${scan.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const togglePublicAccess = async () => {
    if (!teamId) return

    try {
      setIsUpdating(true)
      const response = await fetch(`/api/scans/${scan.id}/public`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          public: !isPublic,
          teamId 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update scan visibility')
      }

      setIsPublic(!isPublic)
      toast.success(
        !isPublic
          ? 'Scan report is now public'
          : 'Scan report is now private'
      )
    } catch (error) {
      console.error('Error updating scan visibility:', error)
      toast.error('Failed to update scan visibility')
    } finally {
      setIsUpdating(false)
    }
  }

  const copyPublicLink = () => {
    const publicUrl = `${window.location.origin}/public/scans/${scan.id}`
    navigator.clipboard.writeText(publicUrl)
    toast.success('Public link copied to clipboard')
  }

  const startTime = new Date(scan.started_at)
  const endTime = scan.finished_at ? new Date(scan.finished_at) : null
  const duration = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : null

  if (teamLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading team...</span>
      </div>
    )
  }

  if (!teamId) {
    return (
      <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          No Team Selected
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Please select a team to view scan reports
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Enterprise Gate Banner */}
      {showEnterpriseBanner && (
        <EnterpriseGateBanner
          scanId={scan.id}
          siteId={scan.site_id}
          discoveredPages={scan.total_violations + scan.passes}
        />
      )}

      {/* Scan Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Score</span>
            <div className={`px-2 py-1 rounded-full text-sm font-medium ${getScoreBg(calculateScore(scan))}`}>
              <span className={getScoreColor(calculateScore(scan))}>
                {calculateScore(scan) !== null ? `${calculateScore(scan)}/100` : 'N/A'}
              </span>
            </div>
          </div>
          {scan.incomplete > 0 && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 text-right">
              {scan.incomplete} {scan.incomplete === 1 ? 'test was' : 'tests were'} incomplete
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</span>
            <div className="flex items-center">
              {scan.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 mr-1" />
              )}
              <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
                {scan.status}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Duration</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {duration ? `${duration}s` : 'N/A'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Issues</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">
              {issues.length}
            </span>
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="mt-8">
        <AISuggestionsPanel 
          violations={scan.issues} 
          url={scan.sites.url} 
        />
      </div>

      {/* Scan Details */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Scan Details
          </h2>
          <div className="flex items-center space-x-4">
            {/* Public Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                checked={isPublic}
                onCheckedChange={togglePublicAccess}
                disabled={isUpdating || !session?.user.pro}
                aria-label="Toggle public access"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                <Globe className="w-4 h-4 mr-1" />
                Public
              </span>
            </div>

            {/* Copy Link Button */}
            {isPublic && (
              <button
                onClick={copyPublicLink}
                className="inline-flex items-center space-x-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Copy public link"
              >
                <LinkIcon className="w-4 h-4" />
                <span>Copy Link</span>
              </button>
            )}

            {/* Compare Button */}
            {previousScan && session?.user.pro && (
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/reports/compare/${previousScan}/${scan.id}`)}
                className="inline-flex items-center"
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Compare to Previous Scan
              </Button>
            )}

            {/* Export Button */}
            <button
              onClick={exportReport}
              className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Scan ID:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100 font-mono">{scan.id}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Created:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {format(new Date(scan.started_at), 'MMM dd, yyyy hh:mm a')}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Started:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {format(new Date(scan.started_at), 'MMM dd, yyyy hh:mm a')}
            </span>
          </div>
          {scan.finished_at && (
            <div>
              <span className="text-gray-600 dark:text-gray-400">Finished:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100">
                {format(new Date(scan.finished_at), 'MMM dd, yyyy hh:mm a')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Issues Summary */}
      {Object.keys(groupedIssues).length > 0 && (
        <div
          id={SAMPLE_REPORT_ANCHOR}
          tabIndex={-1}
          className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {showEnterpriseBanner ? 'Sample Report - Top Issues' : 'Issues Summary'}
            </h2>
            {showEnterpriseBanner && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                Showing up to 50 issues
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['critical', 'serious', 'moderate', 'minor'].map((severity) => (
              <div key={severity} className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${getSeverityColor(severity)}`}>
                  <span className="text-lg font-bold">
                    {groupedIssues[severity as Issue['impact']]?.length || 0}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {severity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues List */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6">Issues Found</h2>
        
        <div className="space-y-6">
          {sortedIssues.map(([impact, issues]) => (
            <div key={impact} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold capitalize">{impact}</h3>
                <Badge variant={impact === 'critical' ? 'destructive' : 'secondary'}>
                  {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
                </Badge>
              </div>
              
              <div className="space-y-4">
                {issues.map(issue => (
                  <IssueCard
                    key={issue.id}
                    {...issue}
                    expanded={expandedIssues.includes(issue.id)}
                    onToggle={() => toggleIssue(issue.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise Gate Modal */}
      <EnterpriseGateModal
        open={showEnterpriseModal}
        onOpenChange={setShowEnterpriseModal}
        onViewSampleReport={() => {
          // Callback is optional - deep link handled in modal
          toast.success('Viewing sample report')
        }}
        discoveredUrls={scan.total_violations + scan.passes}
        scanId={scan.id}
        siteId={scan.site_id}
      />
    </div>
  )
} 
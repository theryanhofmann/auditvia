'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  Copy,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface Issue {
  id: number
  rule: string
  selector: string
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help_url: string | null
  html: string | null
}

interface ScanData {
  id: string
  score: number | null
  status: string
  started_at: string
  finished_at: string | null
  created_at: string
  site_id: string
  sites?: {
    id: string
    name: string | null
    url: string
    user_id: string | null
  }
}

interface ScanReportClientProps {
  scanId: string
  scan: ScanData
}

export function ScanReportClient({ scanId, scan }: ScanReportClientProps) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set())

  const fetchIssues = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/scans/${scanId}/issues`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch scan issues')
      }

      const data = await response.json()
      setIssues(data.issues || [])
    } catch (err) {
      console.error('Error fetching issues:', err)
      setError(err instanceof Error ? err.message : 'Failed to load scan issues')
    } finally {
      setIsLoading(false)
    }
  }, [scanId])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

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

  const toggleIssueExpansion = (issueId: number) => {
    const newExpanded = new Set(expandedIssues)
    if (newExpanded.has(issueId)) {
      newExpanded.delete(issueId)
    } else {
      newExpanded.add(issueId)
    }
    setExpandedIssues(newExpanded)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const exportReport = () => {
    const reportData = {
      scan: {
        id: scan.id,
        score: scan.score,
        status: scan.status,
        created_at: scan.created_at,
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

  const groupedIssues = issues.reduce((acc, issue) => {
    const severity = issue.severity
    if (!acc[severity]) {
      acc[severity] = []
    }
    acc[severity].push(issue)
    return acc
  }, {} as Record<string, Issue[]>)

  const startTime = new Date(scan.started_at)
  const endTime = scan.finished_at ? new Date(scan.finished_at) : null
  const duration = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : null

  return (
    <div className="space-y-6">
      {/* Scan Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Score</span>
            <div className={`px-2 py-1 rounded-full text-sm font-medium ${getScoreBg(scan.score)}`}>
              <span className={getScoreColor(scan.score)}>
                {scan.score !== null ? `${scan.score}/100` : 'N/A'}
              </span>
            </div>
          </div>
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

      {/* Scan Details */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Scan Details
          </h2>
          <button
            onClick={exportReport}
            className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Scan ID:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100 font-mono">{scan.id}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Created:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {format(new Date(scan.created_at), 'MMM dd, yyyy hh:mm a')}
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
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Issues Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['critical', 'serious', 'moderate', 'minor'].map((severity) => (
              <div key={severity} className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${getSeverityColor(severity)}`}>
                  <span className="text-lg font-bold">
                    {groupedIssues[severity]?.length || 0}
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
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 mx-auto text-red-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Failed to load issues
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No issues found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            This scan found no accessibility issues. Great job!
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Accessibility Issues ({issues.length})
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {issues.map((issue) => (
              <div key={issue.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {issue.rule}
                      </h3>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {issue.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Selector: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{issue.selector}</code>
                      </span>
                      {issue.help_url && (
                        <a
                          href={issue.help_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          Learn more →
                        </a>
                      )}
                    </div>
                  </div>
                  
                  {issue.html && (
                    <button
                      onClick={() => toggleIssueExpansion(issue.id)}
                      className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      {expandedIssues.has(issue.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
                
                {issue.html && expandedIssues.has(issue.id) && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        HTML Element
                      </span>
                      <button
                        onClick={() => copyToClipboard(issue.html!)}
                        className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 p-3 rounded border overflow-x-auto">
                      <code>{issue.html}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 
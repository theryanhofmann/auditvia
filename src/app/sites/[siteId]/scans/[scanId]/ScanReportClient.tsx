'use client'

import { useState, useEffect } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  Loader2,
  AlertTriangle,
  Download,
  Shield,
  AlertCircle,
  Info,
  Copy,
  Eye,
  Code
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Violation {
  id: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help: string
  helpUrl: string
  nodes: Array<{
    target: string[]
    html: string
  }>
}

interface ScanData {
  id: string
  site_id: string
  score: number | null
  status: string
  created_at: string
  finished_at: string | null
  duration: number | null
  sites: {
    id: string
    url: string
    name: string | null
  }
  total_violations: number
  violations_by_impact: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
  violations: Violation[]
}

interface ScanReportClientProps {
  scanId: string
}

export function ScanReportClient({ scanId }: ScanReportClientProps) {
  const [scanData, setScanData] = useState<ScanData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedViolations, setExpandedViolations] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchScanReport()
  }, [scanId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchScanReport = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/audit-results/${scanId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch scan report')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to load scan report')
      }

      setScanData(data.scan)
    } catch (err) {
      console.error('Error fetching scan report:', err)
      setError(err instanceof Error ? err.message : 'Failed to load scan report')
      toast.error('Failed to load scan report')
    } finally {
      setIsLoading(false)
    }
  }

  const getScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return 'text-gray-500'
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number | null) => {
    if (score === null || score === undefined) return 'bg-gray-50 dark:bg-gray-900'
    if (score >= 90) return 'bg-green-50 dark:bg-green-900/20'
    if (score >= 70) return 'bg-blue-50 dark:bg-blue-900/20'
    if (score >= 50) return 'bg-yellow-50 dark:bg-yellow-900/20'
    return 'bg-red-50 dark:bg-red-900/20'
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'serious':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case 'moderate':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'minor':
        return <Info className="w-4 h-4 text-blue-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'serious':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
      case 'minor':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'failed':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'pending':
      case 'running':
        return <Clock className="w-5 h-5 text-yellow-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const toggleViolationExpansion = (violationId: string) => {
    const newExpanded = new Set(expandedViolations)
    if (newExpanded.has(violationId)) {
      newExpanded.delete(violationId)
    } else {
      newExpanded.add(violationId)
    }
    setExpandedViolations(newExpanded)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const exportReport = () => {
    if (!scanData) return
    
    const exportData = {
      scan: scanData,
      exported_at: new Date().toISOString(),
      export_version: '1.0'
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `accessibility-report-${scanData.sites.name || 'site'}-${format(new Date(scanData.created_at), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Report exported successfully')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading scan report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Failed to Load Report
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {error}
        </p>
        <button
          onClick={fetchScanReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!scanData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Report Data
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Unable to load scan report data.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Scan Summary Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            {getStatusIcon(scanData.status)}
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Scan Results
              </h2>
              <div className="flex items-center space-x-4 text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                <span>
                  Scanned {formatDistanceToNow(new Date(scanData.created_at), { addSuffix: true })}
                </span>
                <span>•</span>
                <span>
                  {format(new Date(scanData.created_at), 'MMM dd, yyyy at hh:mm a')}
                </span>
                {scanData.duration && (
                  <>
                    <span>•</span>
                    <span>{scanData.duration}s duration</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={exportReport}
            className="flex items-center space-x-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON</span>
          </button>
        </div>

        {/* Score and Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-1">
            <div className={`text-center p-6 rounded-xl ${getScoreBg(scanData.score)}`}>
              <div className={`text-4xl font-bold ${getScoreColor(scanData.score)} mb-2`}>
                {scanData.score !== null ? `${scanData.score}` : 'N/A'}
              </div>
              <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Accessibility Score
              </div>
            </div>
          </div>

          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {scanData.violations_by_impact.critical}
              </div>
              <div className="text-xs font-medium text-red-600">Critical</div>
            </div>
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {scanData.violations_by_impact.serious}
              </div>
              <div className="text-xs font-medium text-orange-600">Serious</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                {scanData.violations_by_impact.moderate}
              </div>
              <div className="text-xs font-medium text-yellow-600">Moderate</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {scanData.violations_by_impact.minor}
              </div>
              <div className="text-xs font-medium text-blue-600">Minor</div>
            </div>
          </div>
        </div>
      </div>

      {/* Violations Section */}
      {scanData.violations && scanData.violations.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Accessibility Violations
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {scanData.total_violations} {scanData.total_violations === 1 ? 'issue' : 'issues'} found
            </p>
          </div>
          
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {scanData.violations.map((violation, index) => (
              <div key={`${violation.id}-${index}`} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3 flex-1">
                    {getImpactIcon(violation.impact)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                          {violation.id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(violation.impact)}`}>
                          {violation.impact}
                        </span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 mb-3">
                        {violation.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm">
                        <a
                          href={violation.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>WCAG Guidelines</span>
                        </a>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {violation.nodes.length} {violation.nodes.length === 1 ? 'element' : 'elements'} affected
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toggleViolationExpansion(violation.id)}
                    className="ml-4 p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    {expandedViolations.has(violation.id) ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                  </button>
                </div>

                {/* Affected Elements */}
                {expandedViolations.has(violation.id) && (
                  <div className="mt-4 space-y-3">
                    <h5 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Affected Elements:
                    </h5>
                    {violation.nodes.map((node, nodeIndex) => (
                      <div key={nodeIndex} className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400">
                            {node.target.join(', ')}
                          </span>
                          <button
                            onClick={() => copyToClipboard(node.html)}
                            className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                            title="Copy HTML"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <pre className="text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 rounded border p-3 overflow-x-auto">
                          <code>{node.html}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Violations Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Congratulations! This scan found no accessibility violations.
          </p>
        </div>
      )}
    </div>
  )
} 
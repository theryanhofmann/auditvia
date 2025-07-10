'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink,
  Loader2,
  Calendar,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Scan {
  id: string
  score: number | null
  status: string
  created_at: string
  finished_at: string | null
  sites: {
    id: string
    url: string
    name: string | null
  }
}

interface ScanHistoryClientProps {
  siteId: string
}

export function ScanHistoryClient({ siteId }: ScanHistoryClientProps) {
  const [scans, setScans] = useState<Scan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const searchParams = useSearchParams()
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const sort = searchParams.get('sort') || 'desc'
  const [currentPage, setCurrentPage] = useState(1)

  const fetchScanHistory = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        siteId,
        limit: limit.toString(),
        page: currentPage.toString(),
        ...(sort && { sort })
      })

      const response = await fetch(`/api/audit-results?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch scan history')
      }

      const data = await response.json()
      setScans(data.scans || [])
    } catch (err) {
      console.error('Error fetching scan history:', err)
      setError(err instanceof Error ? err.message : 'Failed to load scan history')
      toast.error('Failed to load scan history')
    } finally {
      setIsLoading(false)
    }
  }, [siteId, limit, sort, currentPage])

  useEffect(() => {
    fetchScanHistory()
  }, [fetchScanHistory])

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'pending':
      case 'running':
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      case 'error':
        return 'Error'
      case 'pending':
        return 'Pending'
      case 'running':
        return 'Running'
      default:
        return 'Unknown'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading scan history...</p>
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
          Failed to Load History
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {error}
        </p>
        <button
          onClick={fetchScanHistory}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (scans.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Scans Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          This site hasn't been scanned yet. Run your first scan to see the history here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Total Scans</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{scans.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center">
            <TrendingUp className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Latest Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(scans[0]?.score)}`}>
                {scans[0]?.score !== null ? `${scans[0]?.score}/100` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-amber-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Completed</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {scans.filter(scan => scan.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scan History Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Scan History
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {scans.length} {scans.length === 1 ? 'scan' : 'scans'} found
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left py-3 px-6 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Score
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {scans.map((scan) => (
                <tr key={scan.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                  <td className="py-4 px-6">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBg(scan.score)}`}>
                      <span className={getScoreColor(scan.score)}>
                        {scan.score !== null ? `${scan.score}/100` : 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      {getStatusIcon(scan.status)}
                      <span className="ml-2 text-sm text-zinc-900 dark:text-zinc-100">
                        {getStatusText(scan.status)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-zinc-900 dark:text-zinc-100">
                      {format(new Date(scan.created_at), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-zinc-900 dark:text-zinc-100">
                      {scan.finished_at && scan.created_at ? 
                        `${Math.round((new Date(scan.finished_at).getTime() - new Date(scan.created_at).getTime()) / 1000)}s` :
                        'N/A'
                      }
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      {scan.status === 'completed' && (
                        <Link
                          href={`/sites/${siteId}/scans/${scan.id}`}
                          target="_blank"
                          className="p-2 text-zinc-400 hover:text-blue-600 transition-colors"
                          title="View detailed report"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {scans.length >= limit && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Showing {scans.length} of {scans.length >= limit ? `${limit}+` : scans.length} scans
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const newPage = Math.max(1, currentPage - 1)
                  setCurrentPage(newPage)
                }}
                disabled={currentPage === 1}
                className="p-2 text-zinc-400 hover:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Page {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={scans.length < limit}
                className="p-2 text-zinc-400 hover:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
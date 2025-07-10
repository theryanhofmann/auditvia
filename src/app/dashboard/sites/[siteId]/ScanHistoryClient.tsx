'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Calendar,
  Activity,
  AlertTriangle 
} from 'lucide-react'
import Link from 'next/link'

interface Scan {
  id: string
  score: number | null
  status: string
  started_at: string
  finished_at: string | null
  created_at: string
}

interface ScanHistoryClientProps {
  siteId: string
}

export function ScanHistoryClient({ siteId }: ScanHistoryClientProps) {
  const [scans, setScans] = useState<Scan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScans = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/sites/${siteId}/scans`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch scan history')
      }

      const data = await response.json()
      setScans(data.scans || [])
    } catch (err) {
      console.error('Error fetching scans:', err)
      setError(err instanceof Error ? err.message : 'Failed to load scan history')
    } finally {
      setIsLoading(false)
    }
  }, [siteId])

  useEffect(() => {
    fetchScans()
  }, [fetchScans])

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'failed':
        return 'Failed'
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Failed to load scan history
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {error}
        </p>
        <button
          onClick={fetchScans}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
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
          <Activity className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No scans yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Run your first accessibility scan to see results here
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center">
            <Activity className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Scans</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {scans.length}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Latest Score</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {scans[0]?.score !== null ? `${scans[0]?.score}/100` : 'N/A'}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-purple-600 mr-2" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Scan</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {scans[0] ? formatDistanceToNow(new Date(scans[0].created_at), { addSuffix: true }) : 'Never'}
          </div>
        </div>
      </div>

      {/* Scans Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Scan History
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Complete history of accessibility scans
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Scan Date
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Score
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {scans.map((scan) => {
                const startTime = new Date(scan.started_at)
                const endTime = scan.finished_at ? new Date(scan.finished_at) : null
                const duration = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : null

                return (
                  <tr key={scan.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {format(new Date(scan.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(scan.created_at), 'hh:mm a')} • {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                      </div>
                    </td>
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
                        <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                          {getStatusText(scan.status)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {duration ? `${duration}s` : 'N/A'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {scan.status === 'completed' && (
                        <Link
                          href={`/dashboard/reports/${scan.id}`}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Report</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 
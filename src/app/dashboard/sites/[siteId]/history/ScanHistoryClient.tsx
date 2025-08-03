'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { 
  CheckCircle, 
  XCircle, 
  Eye,
  Calendar,
  Activity,
  AlertTriangle,
  Globe,
  Link as LinkIcon,
  Users
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { useSession } from 'next-auth/react'
import { useTeam } from '@/app/context/TeamContext'

interface Scan {
  id: string
  score: number | null
  status: string
  started_at: string
  finished_at: string | null
  created_at: string
  public: boolean
  team_id: string
}

interface ScanHistoryClientProps {
  siteId: string
}

export function ScanHistoryClient({ siteId }: ScanHistoryClientProps) {
  const { data: session } = useSession()
  const { teamId, loading: teamLoading } = useTeam()
  const [scans, setScans] = useState<Scan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-gray-800 dark:text-gray-100"
    if (score >= 90) return "text-green-800 dark:text-green-100"
    if (score >= 70) return "text-blue-800 dark:text-blue-100"
    if (score >= 50) return "text-yellow-800 dark:text-yellow-100"
    return "text-red-800 dark:text-red-100"
  }

  const getScoreBg = (score: number | null) => {
    if (!score) return "bg-gray-100 dark:bg-gray-800"
    if (score >= 90) return "bg-green-100 dark:bg-green-900"
    if (score >= 70) return "bg-blue-100 dark:bg-blue-900"
    if (score >= 50) return "bg-yellow-100 dark:bg-yellow-900"
    return "bg-red-100 dark:bg-red-900"
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
      case 'running':
      case 'pending':
        return <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Completed'
      case 'running':
      case 'pending':
        return 'Running'
      case 'failed':
      case 'error':
        return 'Failed'
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  const fetchScans = useCallback(async () => {
    if (!teamId) {
      setScans([])
      setError('No team selected')
      setIsLoading(false)
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Fetching scan history...', { teamId })
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${window.location.origin}/api/scans/site/${siteId}?teamId=${teamId}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: Scan[] = await response.json()

      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Fetched scans:', {
          count: data.length,
          latestScan: data[0],
          teamId
        })
      }

      setScans(data)
    } catch (error) {
      console.error('Error fetching scans:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch scan history')
      toast.error('Failed to fetch scan history')
    } finally {
      setIsLoading(false)
    }
  }, [siteId, teamId])

  useEffect(() => {
    fetchScans()
    const interval = setInterval(fetchScans, 30000) // Poll every 30 seconds
    return () => clearInterval(interval)
  }, [siteId, teamId, fetchScans])

  const copyPublicLink = (scanId: string) => {
    const publicUrl = `${window.location.origin}/public/scans/${scanId}`
    navigator.clipboard.writeText(publicUrl)
    toast.success('Public link copied to clipboard')
  }

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
          Please select a team to view scan history
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Scan History</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchScans}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-50 transition-colors"
          >
            <Activity className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          {/* The "Run Scan" button is removed as per the new_code, as the scan functionality is no longer here. */}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 animate-pulse">
              <div className="h-6 w-1/4 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
              <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && scans.length === 0 && !error && (
        <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            No Scans Yet
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Run your first accessibility scan to see the results here.
          </p>
          {/* The "Run First Scan" button is removed as per the new_code, as the scan functionality is no longer here. */}
        </div>
      )}

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
                  Visibility
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
                      {scan.public ? (
                        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                          <Globe className="w-4 h-4 mr-1" />
                          Public
                        </div>
                      ) : (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          Private
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {scan.status === 'completed' && (
                          <Link
                            href={`/dashboard/reports/${scan.id}`}
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Report</span>
                          </Link>
                        )}
                        {scan.public && session?.user.pro && (
                          <button
                            onClick={() => copyPublicLink(scan.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            title="Copy public link"
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Copy Link</span>
                          </button>
                        )}
                      </div>
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
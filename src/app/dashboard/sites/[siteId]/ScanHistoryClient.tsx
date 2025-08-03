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
  const [scans, setScans] = useState<Scan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: session } = useSession()
  const { teamId, loading: teamLoading } = useTeam()

  const fetchScans = useCallback(async () => {
    if (!teamId) {
      setScans([])
      setError('No team selected')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/sites/${siteId}/scans?teamId=${teamId}`)
      
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
  }, [siteId, teamId])

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Activity className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading scan history...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Error Loading Scans
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {error}
        </p>
      </div>
    )
  }

  if (scans.length === 0) {
    return (
      <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <Globe className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          No Scans Found
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Run your first accessibility scan to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {scans.map((scan) => (
        <div
          key={scan.id}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Status Icon */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getScoreBg(scan.score)}`}>
                {getStatusIcon(scan.status)}
              </div>

              {/* Scan Info */}
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className={`text-lg font-semibold ${getScoreColor(scan.score)}`}>
                    {scan.score !== null ? `${scan.score}%` : 'No Score'}
                  </h3>
                  {scan.public && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                      <Globe className="w-3 h-3 mr-1" />
                      Public
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={scan.created_at}>
                    {format(new Date(scan.created_at), 'MMM d, yyyy h:mm a')}
                  </time>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(scan.created_at))} ago</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              {scan.public && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/public/scans/${scan.id}`
                    navigator.clipboard.writeText(url)
                    toast.success('Public link copied to clipboard')
                  }}
                  className="inline-flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>Copy Link</span>
                </button>
              )}
              <Link
                href={`/dashboard/reports/${scan.id}?teamId=${teamId}`}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>View Report</span>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 
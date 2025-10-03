'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Clock, RefreshCw, Home, Activity, XCircle } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

interface ScanStuckPageProps {
  scanId: string
  siteId: string
  siteUrl: string
  siteName?: string
  createdAt: string
  lastActivityAt?: string
  progressMessage?: string
  reason: 'timeout' | 'heartbeat_stale' | 'unknown'
  maxRuntimeMinutes?: number
  heartbeatIntervalSeconds?: number
}

export function ScanStuckPage({
  scanId,
  siteId,
  siteUrl,
  siteName,
  createdAt,
  lastActivityAt,
  progressMessage,
  reason,
  maxRuntimeMinutes = 15,
  heartbeatIntervalSeconds = 30
}: ScanStuckPageProps) {
  const router = useRouter()
  const [isMarkingFailed, setIsMarkingFailed] = useState(false)
  const [isStartingNew, setIsStartingNew] = useState(false)

  const scanCreatedAt = new Date(createdAt)
  const lastActivity = new Date(lastActivityAt || createdAt)
  const now = new Date()

  const elapsedMinutes = Math.floor((now.getTime() - scanCreatedAt.getTime()) / (1000 * 60))
  const heartbeatAgeMinutes = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60))

  const getReasonDetails = () => {
    switch (reason) {
      case 'timeout':
        return {
          title: 'Scan Timeout',
          description: `This scan has been running for ${elapsedMinutes} minutes, which exceeds the maximum allowed time of ${maxRuntimeMinutes} minutes.`,
          icon: Clock,
          color: 'text-amber-600'
        }
      case 'heartbeat_stale':
        return {
          title: 'Scan Appears Stuck',
          description: `No activity detected for ${heartbeatAgeMinutes} minutes. Expected activity every ${heartbeatIntervalSeconds} seconds.`,
          icon: Activity,
          color: 'text-red-600'
        }
      default:
        return {
          title: 'Scan Issue Detected',
          description: 'The scan appears to be stuck or experiencing issues.',
          icon: AlertTriangle,
          color: 'text-orange-600'
        }
    }
  }

  const reasonDetails = getReasonDetails()
  const ReasonIcon = reasonDetails.icon

  const handleMarkAsFailed = async () => {
    setIsMarkingFailed(true)
    try {
      const response = await fetch(`/api/admin/cleanup-scans/${scanId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: `User-requested cleanup: ${reason}`
        })
      })

      if (response.ok) {
        // Refresh the page to show the failed state
        router.refresh()
      } else {
        console.error('Failed to mark scan as failed')
        // Could show a toast error here
      }
    } catch (error) {
      console.error('Error marking scan as failed:', error)
    } finally {
      setIsMarkingFailed(false)
    }
  }

  const handleStartNewScan = async () => {
    setIsStartingNew(true)
    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: siteUrl,
          siteId: siteId
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.scanId) {
          router.push(`/dashboard/scans/${data.scanId}`)
        } else {
          console.error('Failed to start new scan:', data.error)
        }
      } else {
        console.error('Failed to start new scan')
      }
    } catch (error) {
      console.error('Error starting new scan:', error)
    } finally {
      setIsStartingNew(false)
    }
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Scan Status
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Report for <span className="font-medium">{siteName || new URL(siteUrl).hostname}</span>
          </p>
        </div>

        {/* Stuck State Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-700 p-8 shadow-sm">
          <div className="text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <ReasonIcon className={`w-16 h-16 ${reasonDetails.color}`} />
                <div className="absolute -top-1 -right-1">
                  <XCircle className="w-6 h-6 text-red-500 bg-white dark:bg-gray-800 rounded-full" />
                </div>
              </div>
            </div>

            {/* Title and Description */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {reasonDetails.title}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-md mx-auto">
              {reasonDetails.description}
            </p>

            {/* Timeline Details */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Started</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {formatDistanceToNow(scanCreatedAt, { addSuffix: true })}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Last Activity</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {formatDistanceToNow(lastActivity, { addSuffix: true })}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">Total Runtime</div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {elapsedMinutes} minutes
                  </div>
                </div>
              </div>

              {progressMessage && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">Last Progress</div>
                  <div className="text-gray-600 dark:text-gray-400 italic">"{progressMessage}"</div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                onClick={handleStartNewScan}
                disabled={isStartingNew}
                variant="default"
                className="flex items-center justify-center"
              >
                {isStartingNew ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Starting New Scan...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Start New Scan
                  </>
                )}
              </Button>

              <Button 
                onClick={handleMarkAsFailed}
                disabled={isMarkingFailed}
                variant="outline"
                className="flex items-center justify-center"
              >
                {isMarkingFailed ? (
                  <>
                    <XCircle className="w-4 h-4 mr-2 animate-spin" />
                    Marking Failed...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Mark as Failed & Close
                  </>
                )}
              </Button>

              <Button 
                onClick={handleGoToDashboard}
                variant="ghost"
                className="flex items-center justify-center"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
          <p>
            <strong>What happened?</strong> The scan process appears to have stopped responding or exceeded time limits.
          </p>
          <p>
            This can happen due to network issues, server problems, or the target website being slow to respond.
          </p>
          <p>
            Starting a new scan will create a fresh attempt. Marking as failed will close this scan permanently.
          </p>
        </div>

        {/* Technical Details */}
        <div className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <p>Scan ID: <span className="font-mono">{scanId}</span></p>
          <p>Site: <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="underline">{siteUrl}</a></p>
          <p>Reason: {reason} | Runtime: {elapsedMinutes}min | Heartbeat age: {heartbeatAgeMinutes}min</p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Globe, AlertCircle, Clock, Activity } from 'lucide-react'
import { scanAnalytics } from '@/lib/safe-analytics'
import { AnimatedScanModal } from '@/app/components/scan/AnimatedScanModal'

interface ScanRunningPageProps {
  scanId: string
  siteUrl: string
  siteName?: string
  siteScreenshot?: string
  createdAt: string
  lastActivityAt?: string
  progressMessage?: string
  maxRuntimeMinutes?: number
  heartbeatIntervalSeconds?: number
  userId?: string
}

export function ScanRunningPage({ 
  scanId, 
  siteUrl, 
  siteName,
  siteScreenshot,
  createdAt, 
  lastActivityAt,
  progressMessage,
  maxRuntimeMinutes = 15,
  heartbeatIntervalSeconds = 30,
  userId 
}: ScanRunningPageProps) {
  const router = useRouter()
  const [pollCount, setPollCount] = useState(0)
  const [isPolling, setIsPolling] = useState(true)
  const [pollDelay, setPollDelay] = useState(500) // Start with 500ms
  const [elapsedTime, setElapsedTime] = useState(0)
  const [stuckReason, setStuckReason] = useState<'timeout' | 'heartbeat_stale' | null>(null)

  // Calculate elapsed time since scan creation
  const scanCreatedAt = new Date(createdAt).getTime()
  const initialLastActivity = new Date(lastActivityAt || createdAt).getTime()
  const now = Date.now()
  
  const totalElapsedMs = now - scanCreatedAt
  
  // For legacy schema compatibility: if lastActivityAt equals createdAt, 
  // it means we're in legacy mode and should disable heartbeat checks
  const isLegacyMode = !lastActivityAt || lastActivityAt === createdAt
  const heartbeatAgeMs = now - initialLastActivity

  useEffect(() => {
    // Update elapsed time every second for display and check guardrails
    const elapsedTimer = setInterval(() => {
      const currentTime = Date.now()
      const currentElapsed = currentTime - scanCreatedAt
      const currentHeartbeatAge = currentTime - initialLastActivity
      
      setElapsedTime(currentElapsed)
      
      // Check polling guardrails
      const maxRuntimeMs = maxRuntimeMinutes * 60 * 1000
      const heartbeatStaleMs = heartbeatIntervalSeconds * 3 * 1000 // 3x the expected interval
      
      if (isPolling) {
        if (currentElapsed > maxRuntimeMs) {
          console.warn(`🔄 [polling] Stopping due to runtime timeout: ${Math.round(currentElapsed/1000)}s > ${maxRuntimeMinutes}min`)
          setIsPolling(false)
          setStuckReason('timeout')
          
          if (userId) {
            scanAnalytics.pollingStopped(scanId, userId, 'timeout', pollCount, currentElapsed)
          }
        } else if (!isLegacyMode && currentHeartbeatAge > heartbeatStaleMs) {
          // Only check heartbeat staleness if NOT in legacy mode
          console.warn(`🔄 [polling] Stopping due to stale heartbeat: ${Math.round(currentHeartbeatAge/1000)}s > ${heartbeatIntervalSeconds * 3}s`)
          setIsPolling(false)
          setStuckReason('heartbeat_stale')
          
          if (userId) {
            scanAnalytics.pollingStopped(scanId, userId, 'heartbeat_stale', pollCount, currentElapsed)
          }
        }
      }
    }, 1000)

    return () => clearInterval(elapsedTimer)
  }, [scanCreatedAt, initialLastActivity, maxRuntimeMinutes, heartbeatIntervalSeconds, isPolling, userId, scanId, pollCount, isLegacyMode])

  useEffect(() => {
    if (!isPolling || stuckReason) return

    const pollScanStatus = async () => {
      try {
        const startTime = Date.now()
        console.log(`🔄 [polling] Attempt ${pollCount + 1} for scan ${scanId}, delay: ${pollDelay}ms`)
        
        // Refresh the page to get updated scan status
        router.refresh()
        setPollCount(prev => prev + 1)
        
        // Adaptive polling based on elapsed time:
        // 0-2 minutes: 0.5s → 1s → 2s → 4s (exponential backoff)
        // 2-10 minutes: 10s intervals
        let nextDelay: number
        
        if (totalElapsedMs < 2 * 60 * 1000) { // First 2 minutes
          nextDelay = Math.min(pollDelay * 2, 4000) // Cap at 4s
        } else { // After 2 minutes
          nextDelay = 10000 // 10 second intervals
        }
        
        setPollDelay(nextDelay)
        
        console.log(`🔄 [polling] Refresh completed in ${Date.now() - startTime}ms, next poll in ${nextDelay}ms`)
        
      } catch (error) {
        console.error('🔄 [polling] Error polling scan status:', error)
        setIsPolling(false)
        
        if (userId) {
          scanAnalytics.pollingStopped(scanId, userId, 'error', pollCount, totalElapsedMs)
        }
      }
    }

    // Use dynamic delay with adaptive backoff
    const timeout = setTimeout(pollScanStatus, pollDelay)

    return () => {
      clearTimeout(timeout)
    }
  }, [scanId, router, isPolling, pollCount, pollDelay, totalElapsedMs, userId, stuckReason])

  // Log polling start analytics once
  useEffect(() => {
    if (userId) {
      scanAnalytics.pollingStarted(scanId, userId)
    }
  }, [scanId, userId])

  const auditDevMode = process.env.NEXT_PUBLIC_AUDIT_DEV_MODE === 'true'

  // If scan is stuck, redirect to stuck page
  if (stuckReason) {
    router.push(`/dashboard/scans/${scanId}/stuck?reason=${stuckReason}&maxRuntime=${maxRuntimeMinutes}&heartbeatInterval=${heartbeatIntervalSeconds}`)
    return null
  }

  console.log('🎬 [ScanRunningPage] Rendering AnimatedScanModal', { scanId, siteUrl })
  
  return (
    <>
      {/* Use AnimatedScanModal for the animated scanning experience */}
      <AnimatedScanModal
        isOpen={true}
        siteUrl={siteUrl}
        siteName={siteName || siteUrl}
        siteScreenshot={siteScreenshot}
        onClose={() => {
          // When user clicks close or clicks action button, redirect to report
          console.log('🎬 [ScanRunningPage] Modal closing, navigating to report...')
          if (scanId) {
            window.location.href = `/dashboard/scans/${scanId}`
          }
        }}
        onAskAI={() => {
          console.log('🎬 [ScanRunningPage] AI Engineer requested')
          if (scanId) {
            window.location.href = `/dashboard/scans/${scanId}?openAI=true`
          }
        }}
        scanId={scanId}
        teamId={userId}
        mode="founder"
      />
      
      {/* Fallback for non-modal display - only shows if modal rendering fails */}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900" style={{ display: 'none' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Accessibility Report
                </h1>
                <div className="flex items-center mt-2 text-gray-600 dark:text-gray-400">
                  <Globe className="w-4 h-4 mr-2" />
                  <span className="text-sm">{siteUrl}</span>
                </div>
              </div>
              {auditDevMode && (
                <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-md text-sm font-medium">
                  Demo Data
                </div>
              )}
            </div>
          </div>

          {/* Scanning Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Scanning in Progress
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                We're analyzing your website for accessibility issues. This usually takes 30-60 seconds.
                The page will automatically update when the scan is complete.
              </p>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>{progressMessage || 'Analyzing page structure and elements'}</span>
                  </div>
                </div>
                
                {/* Elapsed Time and Heartbeat Display */}
                <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-500 mt-2 space-x-4">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {Math.floor(elapsedTime / 1000)}s elapsed
                    </span>
                  </div>
                  {!isLegacyMode && lastActivityAt && (
                    <div className="flex items-center space-x-1">
                      <Activity className="w-3 h-3" />
                      <span>
                        Last activity: {Math.floor(heartbeatAgeMs / 1000)}s ago
                      </span>
                    </div>
                  )}
                  {pollCount > 0 && (
                    <span>
                      • Checked {pollCount} time{pollCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {/* Progress indicator based on elapsed time */}
                {elapsedTime > 60000 && elapsedTime < maxRuntimeMinutes * 60 * 1000 && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center">
                    Taking a bit longer than usual - checking every 10 seconds
                  </div>
                )}

                {/* Heartbeat health indicator - only show in enhanced mode */}
                {!isLegacyMode && lastActivityAt && heartbeatAgeMs > heartbeatIntervalSeconds * 2 * 1000 && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
                    ⚠️ Scan activity slower than expected
                  </div>
                )}
              </div>

              {!isPolling && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-center justify-center text-amber-800 dark:text-amber-200">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <div className="text-center">
                      <div className="text-sm font-medium mb-1">
                        Scan is taking longer than expected
                      </div>
                      <div className="text-xs">
                        This might indicate an issue. Try refreshing the page or starting a new scan.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don't close this page - it will automatically refresh when your scan is ready.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

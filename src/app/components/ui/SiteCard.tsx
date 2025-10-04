'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, Globe, Loader2, Settings } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import toast from 'react-hot-toast'
import { ScanHistory } from './ScanHistory'
import { SiteSettingsDrawer } from './SiteSettingsDrawer'

interface SiteCardProps {
  id: string
  name: string
  url: string
  lastScanAt: string | null
  score: number | null
  monitoring: boolean
  className?: string
  onSiteDeleted?: () => void
}

export function SiteCard({
  id,
  name,
  url,
  lastScanAt,
  score,
  monitoring,
  className,
  onSiteDeleted
}: SiteCardProps) {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [_showSettings, setShowSettings] = useState(false)
  const domain = new URL(url).hostname
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`

  const getComplianceStatus = (score: number | null) => {
    if (score === null) return { text: 'No Scan', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
    if (score >= 90) return { text: 'Fully Compliant', color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' }
    if (score >= 60) return { text: 'Partially Compliant', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' }
    return { text: 'Non-Compliant', color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' }
  }

  const runScan = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent card navigation
    if (isScanning) return

    try {
      setIsScanning(true)
      
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId: id,
          url,
          scanProfile: 'deep' // Always use deep scan
        }),
      })

      // Parse response safely
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('🔍 [SiteCard] Failed to parse API response:', parseError)
        throw new Error('Invalid response from server')
      }

      console.log('🔍 [SiteCard] Audit API response:', data)

      if (!response.ok) {
        // API returned error response with structured error info
        const errorMessage = data?.error?.message || `Server error: ${response.status}`
        const errorCode = data?.error?.code || 'unknown_error'
        throw new Error(`${errorMessage} (${errorCode})`)
      }

      if (!data.success || !data.scanId) {
        console.error('🔍 [SiteCard] Invalid response - missing scanId:', data)
        const errorMessage = data?.error?.message || 'Failed to start scan'
        throw new Error(errorMessage)
      }

      console.log(`🔍 [SiteCard] ✅ Scan created successfully, navigating to: /dashboard/scans/${data.scanId}`)
      
      // Navigate to the new scan report
      const targetUrl = `/dashboard/scans/${data.scanId}`
      console.log(`🔍 [SiteCard] Calling router.push with: ${targetUrl}`)
      router.push(targetUrl)
      toast.success('Scan started successfully')
      
      // Debug: log after router.push
      console.log(`🔍 [SiteCard] router.push called, should be navigating...`)
    } catch (error) {
      console.error('Error starting scan:', error)

      // Extract meaningful error message
      let errorMessage = 'Failed to start scan. Please try again.'
      if (error instanceof Error) {
        // Try to extract specific error details
        const errorStr = error.message
        if (errorStr.includes('playwright_missing')) {
          errorMessage = 'Browser not available. Please try again later.'
        } else if (errorStr.includes('rate_limit')) {
          errorMessage = 'Too many scans recently. Please wait before trying again.'
        } else if (errorStr.includes('authentication_error')) {
          errorMessage = 'Please sign in to run scans.'
        } else if (errorStr.includes('authorization_error')) {
          errorMessage = 'You don\'t have permission to scan this site.'
        } else if (errorStr.includes('validation_error')) {
          errorMessage = 'Invalid scan request. Please check the site URL.'
        } else if (errorStr.includes('database_error')) {
          errorMessage = 'Server error. Please try again.'
        } else {
          // Use the original error message if it's not too generic
          errorMessage = error.message.includes('Failed to start scan')
            ? errorMessage
            : error.message
        }
      }

      toast.error(errorMessage)
      setIsScanning(false)
    }
  }

  const compliance = getComplianceStatus(score)

  return (
    <div className={cn(
      "group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700",
      "shadow-sm hover:shadow-md transition-all duration-200",
      "relative overflow-hidden",
      className
    )}>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {/* Favicon */}
              <div className="relative w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                <Image
                  src={faviconUrl}
                  alt={`${domain} favicon`}
                  width={32}
                  height={32}
                  className="object-contain"
                  onError={(e) => {
                    // If favicon fails to load, show globe icon
                    const target = e.target as HTMLElement
                    target.style.display = 'none'
                    target.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden')
                  }}
                />
                <Globe className="w-5 h-5 text-gray-400 fallback-icon hidden" />
              </div>

              {/* Site Info */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {name || domain}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {domain}
                </p>
              </div>
            </div>

            {/* Arrow Icon */}
            <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Status and Last Scan */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className={cn(
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
              compliance.color
            )}>
              {compliance.text}
              {score !== null && (
                <span className="ml-1 text-gray-500 dark:text-gray-400">
                  ({score}%)
                </span>
              )}
            </div>
            {lastScanAt && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last scan: {lastScanAt ? new Date(lastScanAt).toISOString().split('T')[0] : 'Never'}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            <Link
              href={`/dashboard/sites/${id}/settings`}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button
              onClick={runScan}
              disabled={isScanning}
              className={cn(
                "flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800",
                isScanning
                  ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              )}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                'Run Scan'
              )}
            </button>
          </div>

          {/* Scan History */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <ScanHistory siteId={id} />
          </div>
        </div>

      {/* Settings Drawer */}
      <SiteSettingsDrawer
        siteId={id}
        siteName={name || domain}
        isMonitoringEnabled={monitoring}
        onClose={() => setShowSettings(false)}
        onSiteDeleted={onSiteDeleted}
      />

      {/* Hover Effect Overlay */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 dark:group-hover:border-blue-400 rounded-xl transition-colors pointer-events-none" />
    </div>
  )
} 
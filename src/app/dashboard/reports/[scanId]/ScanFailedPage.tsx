'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw, Home, ExternalLink } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

interface ScanFailedPageProps {
  scanId: string
  siteUrl: string
  siteName?: string
  siteId: string
  errorMessage?: string
  createdAt: string
}

export function ScanFailedPage({ 
  scanId, 
  siteUrl, 
  siteName, 
  siteId, 
  errorMessage, 
  createdAt 
}: ScanFailedPageProps) {
  const router = useRouter()

  const handleRunNewScan = async () => {
    try {
      console.log('🔄 [retry] Starting new scan for site:', siteId)
      
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: siteUrl,
          siteId: siteId
        })
      })

      const data = await response.json()

      if (data.success && data.scanId) {
        console.log('🔄 [retry] New scan started:', data.scanId)
        router.push(`/dashboard/reports/${data.scanId}`)
      } else {
        console.error('🔄 [retry] Failed to start new scan:', data.error)
        alert('Failed to start new scan. Please try again.')
      }
    } catch (error) {
      console.error('🔄 [retry] Error starting new scan:', error)
      alert('Failed to start new scan. Please try again.')
    }
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  const getErrorDisplayMessage = (error?: string): string => {
    if (!error) return 'An unknown error occurred during the scan.'
    
    // Make common errors more user-friendly
    if (error.includes('Playwright not installed')) {
      return 'Browser components are not available. Our team has been notified and is working to resolve this issue.'
    }
    
    if (error.includes('timeout')) {
      return 'The scan took too long to complete. This might be due to a slow website or high server load.'
    }
    
    if (error.includes('browserType.launch')) {
      return 'Unable to start the browser for scanning. This is usually a temporary issue.'
    }
    
    if (error.includes('navigation')) {
      return 'Could not access the website. Please check that the URL is correct and the site is accessible.'
    }
    
    // Return the original error for other cases, but limit length
    return error.length > 200 ? error.substring(0, 200) + '...' : error
  }

  const formatScanDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return 'Unknown'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Scan Failed
              </h1>
              <div className="flex items-center mt-2 text-gray-600 dark:text-gray-400">
                <ExternalLink className="w-4 h-4 mr-2" />
                <span className="text-sm">{siteName || siteUrl}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
          {/* Error Header */}
          <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-200 dark:border-red-800">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 mr-3" />
              <div>
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Accessibility Scan Failed
                </h2>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Scan attempted on {formatScanDate(createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Error Content */}
          <div className="p-6">
            <div className="space-y-6">
              {/* Error Message */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  What happened?
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {getErrorDisplayMessage(errorMessage)}
                  </p>
                </div>
              </div>

              {/* Scan Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Scan ID:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400 font-mono">{scanId}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Site URL:</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400 break-all">{siteUrl}</span>
                </div>
              </div>

              {/* Troubleshooting */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  What can you do?
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>Try running the scan again - temporary issues often resolve themselves</li>
                  <li>Check that your website is accessible and loading properly</li>
                  <li>Ensure your website doesn't block automated tools or require authentication</li>
                  <li>If the problem persists, contact our support team with the scan ID above</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  onClick={handleRunNewScan}
                  className="flex items-center justify-center"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run New Scan
                </Button>
                
                <Button 
                  onClick={handleBackToDashboard}
                  variant="outline"
                  className="flex items-center justify-center"
                  size="lg"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact our support team and include the scan ID for faster assistance.
          </p>
        </div>
      </div>
    </div>
  )
}
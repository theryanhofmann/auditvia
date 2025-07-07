'use client'

import { useState } from 'react'
import { StatsPanel } from './dashboard/StatsPanel'
import { SitesTable } from './dashboard/SitesTable'
import { AddSiteModal } from './ui/AddSiteModal'
import { useSites } from '@/app/lib/hooks/useSites'
import { Plus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export function DashboardClient() {
  const [showAddSiteModal, setShowAddSiteModal] = useState(false)
  const [scanningSiteId, setScanningSiteId] = useState<string | null>(null)
  const { sites, isLoading, refresh } = useSites()

  const handleSiteAdded = () => {
    // Refresh the sites list when a new site is added
    refresh()
  }

  const handleRunScan = async (siteId: string) => {
    try {
      setScanningSiteId(siteId)

      // Get the site URL for the scan
      const site = sites.find(s => s.id === siteId)
      if (!site) {
        throw new Error('Site not found')
      }

      // Step 1: Start the scan
      const auditResponse = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: site.url,
          siteId: siteId,
        }),
      })

      if (!auditResponse.ok) {
        const errorData = await auditResponse.json()
        throw new Error(errorData.error || 'Failed to start scan')
      }

      const auditData = await auditResponse.json()
      
      if (auditData.success && auditData.data?.scan?.id) {
        const scanId = auditData.data.scan.id
        
        // If scan completed immediately (mock mode), show results
        if (auditData.data.scan.status === 'completed') {
          const score = auditData.summary?.score || auditData.data.scan.score
          const violationsCount = auditData.summary?.violations || 0
          toast.success(`Scan completed! Score: ${score}/100 (${violationsCount} issues found)`)
          refresh()
          return
        }
        
        // Step 2: Poll for completion if scan is pending
        await pollScanCompletion(scanId)
      } else {
        throw new Error('Invalid scan response')
      }
    } catch (error) {
      console.error('Error running scan:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to run scan')
    } finally {
      setScanningSiteId(null)
    }
  }

  const pollScanCompletion = async (scanId: string, maxAttempts: number = 30) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch('/api/audit-results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scanId }),
        })

        if (response.ok) {
          const result = await response.json()
          const scan = result.scan
          
          if (scan?.status === 'completed') {
            const score = scan.score || 0
            const issuesCount = scan.issues?.length || scan.total_violations || 0
            toast.success(`Scan completed! Score: ${score}/100 (${issuesCount} issues found)`)
            refresh()
            return
          }
          
          if (scan?.status === 'failed' || scan?.status === 'error') {
            throw new Error(`Scan failed with status: ${scan.status}`)
          }
          
          // Still pending, continue polling
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
          }
        } else {
          throw new Error('Failed to fetch scan status')
        }
      } catch (error) {
        console.error(`Polling attempt ${attempt} failed:`, error)
        if (attempt === maxAttempts) {
          throw new Error('Scan timed out - please check results manually')
        }
        // Continue polling on error unless it's the last attempt
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    throw new Error('Scan timed out after maximum attempts')
  }

  const handleToggleMonitoring = async (siteId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/sites/${siteId}/monitoring`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to toggle monitoring')
      }

      await response.json()
      toast.success(enabled ? 'Monitoring enabled' : 'Monitoring disabled')
      refresh() // Refresh sites data
    } catch (error) {
      console.error('Error toggling monitoring:', error)
      toast.error('Failed to toggle monitoring')
    }
  }

  const handleDeleteSite = async (siteId: string) => {
    try {
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete site')
      }

      toast.success('Site deleted successfully')
      refresh() // Refresh sites data
    } catch (error) {
      console.error('Error deleting site:', error)
      toast.error('Failed to delete site')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor your websites&apos; accessibility performance
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={() => setShowAddSiteModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Site</span>
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      <StatsPanel sites={sites} />

      {/* Sites Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Your Websites
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {sites.length} {sites.length === 1 ? 'website' : 'websites'} being monitored
          </p>
        </div>
        
        <SitesTable
          sites={sites}
          onRunScan={handleRunScan}
          onToggleMonitoring={handleToggleMonitoring}
          onDeleteSite={handleDeleteSite}
          isScanning={scanningSiteId}
        />
      </div>

      {/* Add Site Modal */}
      <AddSiteModal
        isOpen={showAddSiteModal}
        onClose={() => setShowAddSiteModal(false)}
        onSuccess={handleSiteAdded}
      />
    </div>
  )
} 
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

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          siteId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to run scan')
      }

      const data = await response.json()
      
      toast.success(`Scan completed! Score: ${data.scan?.score}/100`)
      
      // Refresh sites data to get updated scan results
      refresh()
    } catch (error) {
      console.error('Error running scan:', error)
      toast.error('Failed to run scan')
    } finally {
      setScanningSiteId(null)
    }
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
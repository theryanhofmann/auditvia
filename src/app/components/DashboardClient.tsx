'use client'

import { useEffect, useState } from 'react'
import { Site } from '@/app/types/dashboard'
import { StatsPanel } from './dashboard/StatsPanel'
import { SitesTable } from './dashboard/SitesTable'
import { Plus, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export function DashboardClient() {
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAddSiteModal, setShowAddSiteModal] = useState(false)

  const fetchSites = async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch('/api/sites')
      if (!response.ok) {
        throw new Error('Failed to fetch sites')
      }
      const data = await response.json()
      setSites(data.sites || [])
    } catch (error) {
      console.error('Error fetching sites:', error)
      toast.error('Failed to load sites')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSites()
  }, [])

  const handleAddSite = async (url: string) => {
    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        throw new Error('Failed to add site')
      }

      const data = await response.json()
      setSites(prev => [data.site, ...prev])
      toast.success('Site added successfully')
      setShowAddSiteModal(false)
    } catch (error) {
      console.error('Error adding site:', error)
      toast.error('Failed to add site')
    }
  }

  const handleRunScan = async (siteId: string) => {
    try {
      const site = sites.find(s => s.id === siteId)
      if (!site) return

      // Update site status optimistically
      setSites(prev => prev.map(s => 
        s.id === siteId ? { ...s, status: 'scanning' } : s
      ))

      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: site.url,
          siteId: site.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to run scan')
      }

      const data = await response.json()
      
      // Update site with scan results
      setSites(prev => prev.map(s => 
        s.id === siteId ? { 
          ...s, 
          status: 'completed',
          score: data.summary?.score,
          last_scan: new Date().toISOString()
        } : s
      ))

      toast.success(`Scan completed! Score: ${data.summary?.score}/100`)
    } catch (error) {
      console.error('Error running scan:', error)
      
      // Revert site status on error
      setSites(prev => prev.map(s => 
        s.id === siteId ? { ...s, status: 'error' } : s
      ))
      
      toast.error('Failed to run scan')
    }
  }

  const handleToggleMonitoring = async (siteId: string, monitoring: boolean) => {
    try {
      const response = await fetch(`/api/sites/${siteId}/monitoring`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ monitoring }),
      })

      if (!response.ok) {
        throw new Error('Failed to toggle monitoring')
      }

      setSites(prev => prev.map(s => 
        s.id === siteId ? { ...s, monitoring } : s
      ))

      toast.success(monitoring ? 'Monitoring enabled' : 'Monitoring disabled')
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

      setSites(prev => prev.filter(s => s.id !== siteId))
      toast.success('Site deleted successfully')
    } catch (error) {
      console.error('Error deleting site:', error)
      toast.error('Failed to delete site')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
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
            onClick={() => fetchSites()}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={() => setShowAddSiteModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-md text-sm font-medium hover:bg-brand-700 transition-colors"
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
        />
      </div>

      {/* Add Site Modal - placeholder */}
      {showAddSiteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Add New Site
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const url = formData.get('url') as string
              if (url) handleAddSite(url)
            }}>
              <div className="mb-4">
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  required
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddSiteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700"
                >
                  Add Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 
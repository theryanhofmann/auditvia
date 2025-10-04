'use client'

import { useState } from 'react'
import { useSites } from '@/app/lib/hooks/useSites'
import { useTeam } from '@/app/context/TeamContext'
import { Globe, Plus, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { AddSiteModal } from '@/app/components/ui/AddSiteModal'

export default function SitesPage() {
  const { sites, isLoading, isError, refresh } = useSites()
  const { teamId, loading: teamLoading } = useTeam()
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false)

  // Debug log
  console.log('🏠 [SitesPage] teamId:', teamId, 'teamLoading:', teamLoading)
  console.log('🏠 [SitesPage] Sites data:', sites?.map(s => ({ id: s.id, name: s.name })))

  const handleSiteAdded = () => {
    setIsAddSiteModalOpen(false)
    refresh() // Refresh the sites list
  }

  // Show loading state while team or sites are loading
  if (isLoading || teamLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    )
  }

  // Show error if teamId is missing
  if (!teamId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800 font-medium mb-2">
              Team Not Found
            </p>
            <p className="text-sm text-yellow-700 mb-4">
              Please refresh the page or return to the dashboard.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium mb-2">
              Error Loading Sites
            </p>
            <p className="text-sm text-red-700">
              {isError.message || 'Failed to load your sites. Please try refreshing the page.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Sites Grid */}
        {sites.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Globe className="w-8 h-8 mx-auto text-gray-400 mb-4" />
            <h3 className="text-base font-medium text-gray-900 mb-2">
              No Sites Yet
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Add your first website to start monitoring accessibility
            </p>
            <button
              type="button"
              onClick={() => setIsAddSiteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Site
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => {
              const displayName = site.name || new URL(site.url).hostname
              
              return (
                <div
                  key={site.id}
                  className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-500 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 mb-1 truncate">
                        {displayName}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {site.url}
                      </p>
                    </div>
                    <Globe className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                  </div>

                  <div className="space-y-1.5">
                    {/* Monitoring Status */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Monitoring</span>
                      <span className="font-medium text-gray-500">
                        Disabled
                      </span>
                    </div>

                    {/* Latest Scan Count */}
                    {site.scans && site.scans.length > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Scans</span>
                        <span className="font-medium text-gray-900">
                          {site.scans.length}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">
                        Added {new Date(site.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {/* Link to latest scan report if available */}
                      {site.scans && site.scans.length > 0 && site.scans[0].status === 'completed' ? (
                        <Link
                          href={`/dashboard/scans/${site.scans[0].id}`}
                          className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-blue-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          View Report
                        </Link>
                      ) : (
                        <Link
                          href={`/dashboard/sites/${site.id}/history${teamId ? `?teamId=${teamId}` : ''}`}
                          className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-blue-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          View History
                        </Link>
                      )}
                      <Link
                        href={`/dashboard/sites/${site.id}/settings${teamId ? `?teamId=${teamId}` : ''}`}
                        className="flex-1 text-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        Settings →
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Add Site Button */}
        {sites.length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setIsAddSiteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Another Site
            </button>
          </div>
        )}
      </div>

      {/* Add Site Modal */}
      <AddSiteModal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        onSuccess={handleSiteAdded}
      />
    </div>
  )
}
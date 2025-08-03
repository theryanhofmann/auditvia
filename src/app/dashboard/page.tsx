'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { SiteCard } from '@/app/components/ui/SiteCard'
import { createClient } from '@/app/lib/supabase/client'
import { useSites } from '@/app/lib/hooks/useSites'

interface Site {
  id: string
  name: string | null
  url: string
  monitoring_enabled?: boolean
  scans?: Array<{
    id: string
    created_at: string
    score: number | null
    total_violations: number | null
  }>
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { sites = [], isLoading, isError } = useSites()
  const [error, setError] = useState<string | null>(null)

  // Handle authentication
  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    redirect('/api/auth/signin')
  }

  useEffect(() => {
    if (isError) {
      setError('Failed to load sites')
    }
  }, [isError])

  // Process sites to get latest scan info
  const processedSites = (sites || []).map(site => {
    const latestScan = site.scans?.[0]
    return {
      ...site,
      lastScanAt: latestScan?.created_at || null,
      score: latestScan?.score || null,
      monitoring: site.monitoring_enabled ?? false
    }
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Your Sites
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage and monitor your website accessibility
          </p>
        </div>

        {processedSites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedSites.map(site => (
              <SiteCard
                key={site.id}
                id={site.id}
                name={site.name || ''}
                url={site.url}
                lastScanAt={site.lastScanAt}
                score={site.score}
                monitoring={site.monitoring}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="max-w-sm mx-auto">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No sites added yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Add your first site to start monitoring its accessibility compliance.
              </p>
              <button
                onClick={() => {/* Add site modal logic */}}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Add Your First Site
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
} 
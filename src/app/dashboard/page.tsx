'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { SiteCard } from '@/app/components/ui/SiteCard'
import { AddSiteModal } from '@/app/components/ui/AddSiteModal'
import { useSites } from '@/app/lib/hooks/useSites'

interface Site {
  id: string
  name: string | null
  url: string
  monitoring_enabled?: boolean
  scans?: Array<{
    id: string
    created_at: string
    total_violations: number | null
    status: string | null
  }>
}

interface ProcessedSite extends Site {
  lastScanAt: string | null
  score: number | null
  monitoring: boolean
}

// Loading component (no hooks)
function DashboardLoading() {
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

// Dashboard content component for authenticated users
function DashboardContent({ 
  sites, 
  isLoading, 
  error,
  onRefresh
}: { 
  sites: Site[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
}) {
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false)

  // Process sites to get latest scan info - moved to useMemo for performance
  const processedSites = useMemo(() => {
    return (sites || []).map(site => {
      const latestScan = site.scans?.[0]
      // Calculate accessibility score treating inapplicable as passes (consistent with report pages)
      const calculateScore = (scan: any) => {
        if (!scan) return null
        const totalTests = (scan.passes || 0) + (scan.total_violations || 0) + (scan.incomplete || 0) + (scan.inapplicable || 0)
        if (totalTests === 0) return null
        
        // Treat inapplicable as successful tests (same as report pages)
        const successfulTests = (scan.passes || 0) + (scan.inapplicable || 0)
        const score = Math.round((successfulTests / totalTests) * 100)
        
        console.log(`📊 [dashboard] Score calculation for scan ${scan.id}:`, {
          passes: scan.passes,
          violations: scan.total_violations,
          incomplete: scan.incomplete,
          inapplicable: scan.inapplicable,
          totalTests,
          successfulTests,
          score
        })
        
        return Math.max(0, Math.min(100, score))
      }
      
      return {
        ...site,
        lastScanAt: latestScan?.created_at || null,
        score: calculateScore(latestScan),
        monitoring: site.monitoring_enabled ?? false
      }
    })
  }, [sites])

  const handleSiteAdded = useCallback(() => {
    setIsAddSiteModalOpen(false)
    onRefresh()
  }, [onRefresh])

  if (isLoading) {
    return <DashboardLoading />
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
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
              onClick={() => setIsAddSiteModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Add Your First Site
            </button>
          </div>
        </div>
      )}

      <AddSiteModal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        onSuccess={handleSiteAdded}
      />
    </div>
  )
}

export default function DashboardPage() {
  // ALL HOOKS DECLARED AT TOP LEVEL - FIXED ORDER EVERY RENDER
  const { data: session, status } = useSession()
  const router = useRouter()
  const { sites = [], isLoading, isError, refresh } = useSites()
  const [error, setError] = useState<string | null>(null)

  // All useEffects together
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (isError) {
      setError('Failed to load sites')
    }
  }, [isError])

  // CONDITIONAL RENDERING - NO MORE HOOKS AFTER THIS POINT
  if (status === 'loading') {
    return <DashboardLoading />
  }

  if (status === 'authenticated') {
    return (
      <>
        <Toaster position="top-right" />
        <DashboardContent 
          sites={sites} 
          isLoading={isLoading} 
          error={error}
          onRefresh={refresh}
        />
      </>
    )
  }

  // Fallback while redirecting
  return <DashboardLoading />
} 
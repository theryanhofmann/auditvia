'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { Badge } from '@/app/components/ui/badge'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Play, RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

// Create a custom hook for Supabase client
function useSupabase() {
  // Only create the client once
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return supabase
}

interface ScanHistoryClientProps {
  siteId: string
  initialScans: Array<{
    id: string
    created_at: string
    score: number | null
    status: string
    total_violations: number | null
    issues_count: number | null
    site: {
      name: string | null
      url: string
    }
  }>
}

// Type for the raw scan data from Supabase
type RawScanFromDB = {
  id: string
  created_at: string
  score: number | null
  status: string
  total_violations: number | null
  issues: Array<{ count: number }> | null
  site: {
    name: string | null
    url: string
  }
}

// Type guard to check if data matches RawScanFromDB shape
function isRawScanFromDB(data: unknown): data is RawScanFromDB {
  if (!data || typeof data !== 'object') return false
  
  const scan = data as Record<string, unknown>
  const site = scan.site as Record<string, unknown> | undefined
  
  return (
    typeof scan.id === 'string' &&
    typeof scan.created_at === 'string' &&
    (scan.score === null || typeof scan.score === 'number') &&
    typeof scan.status === 'string' &&
    (scan.total_violations === null || typeof scan.total_violations === 'number') &&
    (scan.issues === null || (Array.isArray(scan.issues) && scan.issues.every(i => 
      i && typeof i === 'object' && 'count' in i && typeof i.count === 'number'
    ))) &&
    !!site &&
    typeof site === 'object' &&
    (site.name === null || typeof site.name === 'string') &&
    typeof site.url === 'string'
  )
}

// Type guard to check if array of data matches RawScanFromDB[]
function isRawScanArray(data: unknown): data is RawScanFromDB[] {
  return Array.isArray(data) && data.every(isRawScanFromDB)
}

// Transform function to convert RawScanFromDB to the display format
function transformScan(scan: RawScanFromDB) {
  return {
    id: scan.id,
    created_at: scan.created_at,
    score: scan.score,
    status: scan.status,
    total_violations: scan.total_violations,
    issues_count: scan.issues?.[0]?.count ?? null,
    site: {
      name: scan.site.name,
      url: scan.site.url
    }
  }
}

export function ScanHistoryClient({ siteId, initialScans }: ScanHistoryClientProps) {
  const [scans, setScans] = useState(initialScans)
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = useSupabase()

  const getScoreColor = (score: number | null) => {
    if (!score) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
    if (score >= 90) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
    if (score >= 70) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
    if (score >= 50) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      case 'running':
      case 'pending':
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
      case 'failed':
      case 'error':
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
    }
  }

  const refreshScans = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Refreshing scan history...')
    }

    try {
      setIsLoading(true)
      setError(null)

      const { data: latestScans, error } = await supabase
        .from('scans')
        .select(`
          id,
          created_at,
          score,
          status,
          total_violations,
          issues:issues(count),
          site:sites!inner (
            name,
            url
          )
        `)
        .eq('site_id', siteId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        throw new Error(error.message)
      }

      if (!isRawScanArray(latestScans)) {
        throw new Error('Invalid scan data format received from server')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Fetched scans:', {
          count: latestScans.length,
          latestScan: latestScans[0]
        })
      }

      setScans(latestScans.map(transformScan))
      router.refresh() // Refresh server components
    } catch (error) {
      console.error('Error refreshing scans:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh scan history')
      toast.error('Failed to refresh scan history')
    } finally {
      setIsLoading(false)
    }
  }

  const runScan = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Starting new scan...')
    }

    try {
      setIsScanning(true)
      setError(null)

      // Get the site URL for the scan
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('url')
        .eq('id', siteId)
        .single()

      if (siteError || !site) {
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
        
        if (process.env.NODE_ENV === 'development') {
          console.log('📋 Scan started:', { scanId })
        }
        
        // If scan completed immediately (mock mode), show results
        if (auditData.data.scan.status === 'completed') {
          const score = auditData.summary?.score || auditData.data.scan.score
          const violationsCount = auditData.summary?.violations || 0
          toast.success(`Scan completed! Score: ${score}/100 (${violationsCount} issues found)`)
          await refreshScans()
          return
        }
        
        // Step 2: Poll for completion if scan is pending
        await pollScanCompletion(scanId)
      } else {
        throw new Error('Invalid scan response')
      }
    } catch (error) {
      console.error('Error running scan:', error)
      setError(error instanceof Error ? error.message : 'Failed to run scan')
      toast.error(error instanceof Error ? error.message : 'Failed to run scan')
    } finally {
      setIsScanning(false)
    }
  }

  const pollScanCompletion = async (scanId: string, maxAttempts: number = 30) => {
    let lastStatus = ''
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔄 Polling scan status (attempt ${attempt}/${maxAttempts})...`)
        }

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
          
          // Only log status changes
          if (scan?.status !== lastStatus) {
            lastStatus = scan?.status
            if (process.env.NODE_ENV === 'development') {
              console.log('📊 Scan status update:', { scanId, status: scan?.status })
            }
          }
          
          if (scan?.status === 'completed') {
            const score = scan.score || 0
            const issuesCount = scan.issues?.length || scan.total_violations || 0
            toast.success(`Scan completed! Score: ${score}/100 (${issuesCount} issues found)`)
            await refreshScans()
            return
          }
          
          if (scan?.status === 'failed' || scan?.status === 'error') {
            throw new Error(`Scan failed with status: ${scan.status}`)
          }
          
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        } else {
          throw new Error('Failed to fetch scan status')
        }
      } catch (error) {
        console.error(`Polling attempt ${attempt} failed:`, error)
        if (attempt === maxAttempts) {
          throw new Error('Scan timed out - please check results manually')
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    throw new Error('Scan timed out after maximum attempts')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Scan History</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={refreshScans}
            disabled={isLoading || isScanning}
            className="flex items-center space-x-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={runScan}
            disabled={isLoading || isScanning}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Scan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 animate-pulse">
              <div className="h-6 w-1/4 bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
              <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-700 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && scans.length === 0 && (
        <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            No Scans Yet
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Run your first accessibility scan to see the results here.
          </p>
          <button
            onClick={runScan}
            disabled={isScanning}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Run First Scan</span>
          </button>
        </div>
      )}

      {/* Scan List */}
      {!isLoading && scans.length > 0 && (
        <div className="space-y-4">
          {scans.map(scan => (
            <Link
              key={scan.id}
              href={`/scan/${scan.id}`}
              className="block bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <Badge className={getScoreColor(scan.score)}>
                      Score: {scan.score !== null ? `${scan.score}/100` : 'N/A'}
                    </Badge>
                    <Badge className={getStatusColor(scan.status)}>
                      {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                    </Badge>
                    {scan.total_violations !== null && (
                      <Badge variant="outline">
                        {scan.total_violations} {scan.total_violations === 1 ? 'issue' : 'issues'}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    <time dateTime={scan.created_at} title={format(new Date(scan.created_at), 'PPpp')}>
                      {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                    </time>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {scan.site.name || scan.site.url}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
} 
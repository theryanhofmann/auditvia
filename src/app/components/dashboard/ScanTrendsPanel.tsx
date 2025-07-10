'use client'

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react'
import { Badge } from '../ui/badge'

// Initialize Supabase client once
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ScanTrend {
  id: string
  scan_id: string
  site_id: string
  score_change: number
  new_issues_count: number
  resolved_issues_count: number
  created_at: string
  site: {
    name: string | null
    url: string
  }
}

export interface ScanTrendsPanelRef {
  refresh: () => void
}

export const ScanTrendsPanel = forwardRef<ScanTrendsPanelRef>(function ScanTrendsPanel(_, ref) {
  const [trends, setTrends] = useState<ScanTrend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchTrends() {
    try {
      setIsLoading(true)
      setError(null)

      // First check if the table exists
      const { data: tableExists } = await supabase
        .from('scan_trends')
        .select('id')
        .limit(1)
        .maybeSingle()

      // If table doesn't exist yet, show appropriate message
      if (!tableExists) {
        setTrends([])
        return
      }

      // Fetch scan trends
      const { data: trendData, error: trendError } = await supabase
        .from('scan_trends')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (trendError) {
        throw new Error(trendError.message)
      }

      // Then fetch site details for each trend
      const siteIds = [...new Set(trendData.map(t => t.site_id))]
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('id, name, url')
        .in('id', siteIds)

      if (siteError) {
        throw new Error(siteError.message)
      }

      // Combine the data
      const siteMap = new Map(siteData.map(site => [site.id, site]))
      const combinedData = trendData.map(trend => ({
        ...trend,
        site: siteMap.get(trend.site_id) || { name: null, url: 'Unknown Site' }
      }))

      setTrends(combinedData)
    } catch (error) {
      console.error('Error fetching scan trends:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch scan trends')
      setTrends([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTrends()
  }, [])

  useImperativeHandle(ref, () => ({
    refresh: fetchTrends
  }))

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recent Changes</h2>
        </div>
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recent Changes</h2>
        </div>
        <div className="text-center py-8 text-red-500">
          <p className="text-sm">Error loading scan trends.</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Recent Changes</h2>
      </div>

      <div className="space-y-4">
        {trends.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            <p className="text-sm">No recent changes found.</p>
            <p className="text-xs mt-1">Changes will appear here after running multiple scans.</p>
          </div>
        ) : (
          trends.map(trend => (
            <div
              key={trend.id}
              className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {trend.site.name || trend.site.url}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {formatDistanceToNow(new Date(trend.created_at), { addSuffix: true })}
                </p>
              </div>

              <div className="flex items-center gap-4 ml-4">
                {/* Score Change */}
                <div className="flex items-center gap-1">
                  {trend.score_change === 0 ? (
                    <MinusIcon className="w-4 h-4 text-zinc-400" />
                  ) : trend.score_change > 0 ? (
                    <ArrowUpIcon className="w-4 h-4 text-green-500" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4 text-red-500" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      trend.score_change === 0
                        ? 'text-zinc-400 dark:text-zinc-500'
                        : trend.score_change > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {trend.score_change > 0 ? '+' : ''}
                    {trend.score_change}
                  </span>
                </div>

                {/* New Issues */}
                <Badge
                  variant="outline"
                  className={
                    trend.new_issues_count === 0
                      ? 'text-zinc-400 dark:text-zinc-500'
                      : 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                  }
                >
                  +{trend.new_issues_count} new
                </Badge>

                {/* Resolved Issues */}
                <Badge
                  variant="outline"
                  className={
                    trend.resolved_issues_count === 0
                      ? 'text-zinc-400 dark:text-zinc-500'
                      : 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/50'
                  }
                >
                  {trend.resolved_issues_count} fixed
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}) 
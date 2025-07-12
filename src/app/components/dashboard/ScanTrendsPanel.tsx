'use client'

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ScanTrend {
  id: string
  site_id: string
  previous_scan_id: string | null
  new_issues_count: number
  resolved_issues_count: number
  critical_issues_delta: number
  serious_issues_delta: number
  moderate_issues_delta: number
  minor_issues_delta: number
  created_at: string | null
  site: {
    name: string | null
    url: string
  }
}

export interface ScanTrendsPanelRef {
  refresh: () => Promise<void>
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
      const siteIds = [...new Set(trendData.map((t: { site_id: string }) => t.site_id))]
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('id, name, url')
        .in('id', siteIds)

      if (siteError) {
        throw new Error(siteError.message)
      }

      // Combine the data
      const siteMap = new Map(siteData.map((site: { id: string; name: string | null; url: string }) => [site.id, site]))
      const combinedData = trendData.map((trend: Database['public']['Tables']['scan_trends']['Row']) => ({
        ...trend,
        site: siteMap.get(trend.site_id) || { name: null, url: 'Unknown Site' }
      }))

      setTrends(combinedData as ScanTrend[])
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

  if (error) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Recent Scan Trends</h2>
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Recent Scan Trends</h2>
          <div className="space-y-4">
            <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (!trends.length) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Recent Scan Trends</h2>
          <div className="text-gray-500">No scan trends available yet.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Recent Scan Trends</h2>
        <div className="space-y-4">
          {trends.map(trend => (
            <div key={trend.id} className="border-b pb-4 last:border-b-0">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{trend.site.name || trend.site.url}</h4>
                  <p className="text-sm text-gray-500">
                    {new Date(trend.created_at!).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    {trend.new_issues_count > 0 && (
                      <span className="text-red-500">+{trend.new_issues_count} new</span>
                    )}
                    {trend.new_issues_count > 0 && trend.resolved_issues_count > 0 && ' / '}
                    {trend.resolved_issues_count > 0 && (
                      <span className="text-green-500">{trend.resolved_issues_count} fixed</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="mt-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-red-500">Critical: {trend.critical_issues_delta}</span>
                  </div>
                  <div>
                    <span className="text-orange-500">Serious: {trend.serious_issues_delta}</span>
                  </div>
                  <div>
                    <span className="text-yellow-500">Moderate: {trend.moderate_issues_delta}</span>
                  </div>
                  <div>
                    <span className="text-blue-500">Minor: {trend.minor_issues_delta}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}) 
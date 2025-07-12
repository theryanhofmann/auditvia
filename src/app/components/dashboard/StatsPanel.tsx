'use client'

import type { Database } from '@/app/types/database'
import { StatsCard } from './StatsCard'
import { AuditFrequencyChart } from './AuditFrequencyChart'
import { Globe, TrendingUp, Shield, Activity, AlertCircle } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns'

type Site = Database['public']['Tables']['sites']['Row']
type Scan = Database['public']['Tables']['scans']['Row']

// Initialize Supabase client
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface StatsPanelProps {
  sites: Site[]
}

interface Stats {
  totalScans: number
  currentMonthScans: number
  previousMonthScans: number
  scansByDay: { date: string; count: number }[]
  isLoading: boolean
  error: string | null
}

export function StatsPanel({ sites }: StatsPanelProps) {
  const [stats, setStats] = useState<Stats>({
    totalScans: 0,
    currentMonthScans: 0,
    previousMonthScans: 0,
    scansByDay: [],
    isLoading: true,
    error: null
  })

  const fetchStats = useCallback(async () => {
    if (!sites.length) {
      setStats(prev => ({ ...prev, isLoading: false }))
      return
    }

    try {
      const siteIds = sites.map(site => site.id)

      // Get date ranges
      const now = new Date()
      const currentMonthStart = startOfMonth(now)
      const currentMonthEnd = endOfMonth(now)
      const previousMonthStart = startOfMonth(subMonths(now, 1))
      const previousMonthEnd = endOfMonth(subMonths(now, 1))
      const thirtyDaysAgo = subDays(now, 30)

      // Fetch all stats in parallel
      const [scansResponse, currentMonthResponse, previousMonthResponse, scansByDayResponse] = await Promise.all([
        // Get total scans
        supabase
          .from('scans')
          .select('id', { count: 'exact' })
          .eq('status', 'completed')
          .in('site_id', siteIds),
          
        // Get current month scans count
        supabase
          .from('scans')
          .select('id', { count: 'exact' })
          .eq('status', 'completed')
          .in('site_id', siteIds)
          .gte('created_at', currentMonthStart.toISOString())
          .lte('created_at', currentMonthEnd.toISOString()),
          
        // Get previous month scans count
        supabase
          .from('scans')
          .select('id', { count: 'exact' })
          .eq('status', 'completed')
          .in('site_id', siteIds)
          .gte('created_at', previousMonthStart.toISOString())
          .lte('created_at', previousMonthEnd.toISOString()),
          
        // Get scans by day for the last 30 days
        supabase
          .from('scans')
          .select('created_at')
          .eq('status', 'completed')
          .in('site_id', siteIds)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true })
      ])

      if (scansResponse.error) throw new Error(scansResponse.error.message)
      if (currentMonthResponse.error) throw new Error(currentMonthResponse.error.message)
      if (previousMonthResponse.error) throw new Error(previousMonthResponse.error.message)
      if (scansByDayResponse.error) throw new Error(scansByDayResponse.error.message)

      // Process scans by day
      const scansByDay = scansByDayResponse.data.reduce<{ [key: string]: number }>((acc, scan) => {
        if (!scan.created_at) return acc
        const date = new Date(scan.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {})

      // Convert to array format
      const scansByDayArray = Object.entries(scansByDay).map(([date, count]) => ({
        date,
        count
      }))

      setStats({
        totalScans: scansResponse.count || 0,
        currentMonthScans: currentMonthResponse.count || 0,
        previousMonthScans: previousMonthResponse.count || 0,
        scansByDay: scansByDayArray,
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch stats'
      }))
    }
  }, [sites])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (stats.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        ))}
      </div>
    )
  }

  if (stats.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <p>Error loading stats: {stats.error}</p>
        </div>
      </div>
    )
  }

  const monthOverMonth = stats.previousMonthScans > 0
    ? ((stats.currentMonthScans - stats.previousMonthScans) / stats.previousMonthScans) * 100
    : 0

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Sites"
          value={sites.length}
          description="Sites being monitored"
          icon={Globe}
        />
        <StatsCard
          title="Total Scans"
          value={stats.totalScans}
          description="Accessibility audits completed"
          icon={Shield}
        />
        <StatsCard
          title="Scans This Month"
          value={stats.currentMonthScans}
          description={`${monthOverMonth > 0 ? '+' : ''}${monthOverMonth.toFixed(1)}% vs last month`}
          icon={Activity}
          trend={monthOverMonth > 0 ? 'up' : monthOverMonth < 0 ? 'down' : 'neutral'}
        />
        <StatsCard
          title="Scan Frequency"
          value={stats.scansByDay.length > 0 ? (stats.scansByDay.reduce((sum, day) => sum + day.count, 0) / stats.scansByDay.length).toFixed(1) : '0'}
          description="Average scans per day"
          icon={TrendingUp}
        />
      </div>

      {stats.scansByDay.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Audit Frequency
            </h2>
          </div>
          <div className="mt-4 h-[200px]">
            <AuditFrequencyChart data={stats.scansByDay} />
          </div>
        </div>
      )}
    </div>
  )
} 
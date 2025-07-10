'use client'

import { Site } from '@/app/types/database'
import { StatsCard } from './StatsCard'
import { AuditFrequencyChart } from './AuditFrequencyChart'
import { Globe, TrendingUp, Shield, Activity, AlertCircle } from 'lucide-react'
import { useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'

interface StatsPanelProps {
  sites: Site[]
}

interface DashboardStats {
  totalSites: number
  totalScans: number
  averageScore: number | null
  bestScore: number | null
  worstScore: number | null
  scansByDay: { date: string; count: number }[]
  currentMonthScans: number
  previousMonthScans: number
  isError: boolean
  errorMessage?: string
}

export interface StatsPanelRef {
  refresh: () => void
}

export const StatsPanel = forwardRef<StatsPanelRef, StatsPanelProps>(function StatsPanel({ sites }, ref) {
  const [stats, setStats] = useState<DashboardStats>({
    totalSites: sites.length,
    totalScans: 0,
    averageScore: null,
    bestScore: null,
    worstScore: null,
    scansByDay: [],
    currentMonthScans: 0,
    previousMonthScans: 0,
    isError: false
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Fetching dashboard stats...')
    }

    if (!sites?.length) {
      setStats({
        totalSites: 0,
        totalScans: 0,
        averageScore: null,
        bestScore: null,
        worstScore: null,
        scansByDay: [],
        currentMonthScans: 0,
        previousMonthScans: 0,
        isError: false
      })
      return
    }

    try {
      setIsLoading(true)
      
      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Get the date ranges for current and previous months
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
      
      // Get the date 30 days ago for the chart
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      thirtyDaysAgo.setHours(0, 0, 0, 0)
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📅 Date ranges:', {
          currentMonth: { start: currentMonthStart, end: currentMonthEnd },
          previousMonth: { start: previousMonthStart, end: previousMonthEnd },
          thirtyDaysAgo: thirtyDaysAgo.toISOString()
        })
      }

      // Get site IDs for filtering
      const siteIds = sites.map(site => site.id)
      if (siteIds.length === 0) {
        setStats({
          totalSites: 0,
          totalScans: 0,
          averageScore: null,
          bestScore: null,
          worstScore: null,
          scansByDay: [],
          currentMonthScans: 0,
          previousMonthScans: 0,
          isError: false
        })
        return
      }

      // Fetch all stats in parallel
      const [scansResponse, currentMonthResponse, previousMonthResponse, scansByDayResponse] = await Promise.all([
        // Get total scans, average score, min/max scores
        supabase
          .from('scans')
          .select('score', { count: 'exact' })
          .eq('status', 'completed')
          .in('site_id', siteIds),
          
        // Get current month scans count
        supabase
          .from('scans')
          .select('id', { count: 'exact' })
          .eq('status', 'completed')
          .in('site_id', siteIds)
          .gte('created_at', currentMonthStart)
          .lte('created_at', currentMonthEnd),
          
        // Get previous month scans count
        supabase
          .from('scans')
          .select('id', { count: 'exact' })
          .eq('status', 'completed')
          .in('site_id', siteIds)
          .gte('created_at', previousMonthStart)
          .lte('created_at', previousMonthEnd),
          
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

      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Raw stats:', {
          totalScans: scansResponse.count,
          currentMonth: currentMonthResponse.count,
          previousMonth: previousMonthResponse.count,
          dailyScans: scansByDayResponse.data.length
        })
      }

      // Calculate average, min, max scores
      const scores = scansResponse.data
        .map(scan => scan.score)
        .filter((score): score is number => score !== null)

      const averageScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null

      const bestScore = scores.length > 0
        ? Math.max(...scores)
        : null

      const worstScore = scores.length > 0
        ? Math.min(...scores)
        : null

      // Group scans by day
      const scansByDay = scansByDayResponse.data.reduce((acc: { [key: string]: number }, scan) => {
        const date = new Date(scan.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {})

      // Fill in missing days with 0 counts
      const allDays: { date: string; count: number }[] = []
      for (let d = new Date(thirtyDaysAgo); d <= new Date(); d.setDate(d.getDate() + 1)) {
        const date = d.toISOString().split('T')[0]
        allDays.push({
          date,
          count: scansByDay[date] || 0
        })
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('📈 Calculated stats:', {
          averageScore,
          bestScore,
          worstScore,
          dailyScansRange: {
            min: Math.min(...allDays.map(d => d.count)),
            max: Math.max(...allDays.map(d => d.count))
          }
        })
      }

      setStats({
        totalSites: sites.length,
        totalScans: scansResponse.count || 0,
        averageScore,
        bestScore,
        worstScore,
        scansByDay: allDays,
        currentMonthScans: currentMonthResponse.count || 0,
        previousMonthScans: previousMonthResponse.count || 0,
        isError: false
      })

    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setStats(prev => ({
        ...prev,
        isError: true,
        errorMessage: error instanceof Error ? error.message : 'Failed to fetch stats'
      }))
    } finally {
      setIsLoading(false)
    }
  }, [sites])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useImperativeHandle(ref, () => ({
    refresh: fetchStats
  }))

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev: DashboardStats) => ({
        ...prev,
        scansByDay: prev.scansByDay.map(day => ({ ...day }))
      }))
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  // Calculate month-over-month trend
  const scanTrend = stats.previousMonthScans > 0
    ? ((stats.currentMonthScans - stats.previousMonthScans) / stats.previousMonthScans) * 100
    : stats.currentMonthScans > 0 ? 100 : 0

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 h-32" />
          ))}
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 h-64" />
      </div>
    )
  }

  if (stats.isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-red-700 dark:text-red-400">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-5 h-5" />
          <h3 className="font-medium">Error Loading Dashboard Stats</h3>
        </div>
        <p className="mt-2 text-sm">{stats.errorMessage || 'Please try refreshing the page.'}</p>
      </div>
    )
  }

  if (sites.length === 0) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">No Sites Added</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Add your first website to start monitoring accessibility scores.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Sites"
          value={stats.totalSites}
          description="Websites being monitored"
          icon={Globe}
        />
        
        <StatsCard
          title="Average Score"
          value={stats.averageScore !== null ? `${stats.averageScore}/100` : 'No scans'}
          description={stats.totalScans > 0 ? "Overall accessibility rating" : "Run your first scan to see scores"}
          icon={Shield}
          valueColor={stats.averageScore !== null ? getScoreColor(stats.averageScore) : undefined}
        />
        
        <StatsCard
          title="Total Audits"
          value={stats.totalScans}
          trend={scanTrend > 0 ? 'up' : scanTrend < 0 ? 'down' : 'neutral'}
          trendValue={stats.totalScans > 0 && scanTrend !== 0 ? (scanTrend > 0 ? `+${Math.round(scanTrend)}%` : `${Math.round(scanTrend)}%`) : '—'}
          description="Completed accessibility scans"
          icon={Activity}
        />
        
        <StatsCard
          title="This Month"
          value={stats.currentMonthScans}
          trend={stats.currentMonthScans > stats.previousMonthScans ? 'up' : stats.currentMonthScans < stats.previousMonthScans ? 'down' : 'neutral'}
          trendValue={stats.currentMonthScans > 0 || stats.previousMonthScans > 0 ? (stats.currentMonthScans > stats.previousMonthScans ? `+${stats.currentMonthScans - stats.previousMonthScans}` : stats.currentMonthScans < stats.previousMonthScans ? `${stats.currentMonthScans - stats.previousMonthScans}` : '—') : '—'}
          description="Audits completed this month"
          icon={TrendingUp}
        />
      </div>

      {/* Score Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="Best Score"
          value={stats.bestScore !== null ? `${stats.bestScore}/100` : 'No scans'}
          description={stats.totalScans > 0 ? "Highest accessibility score" : "Run your first scan to see scores"}
          icon={TrendingUp}
          valueColor={stats.bestScore !== null ? getScoreColor(stats.bestScore) : undefined}
        />
        
        <StatsCard
          title="Worst Score"
          value={stats.worstScore !== null ? `${stats.worstScore}/100` : 'No scans'}
          description={stats.totalScans > 0 ? "Lowest accessibility score" : "Run your first scan to see scores"}
          icon={Shield}
          valueColor={stats.worstScore !== null ? getScoreColor(stats.worstScore) : undefined}
        />
      </div>

      {/* Audit Frequency Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Audit Frequency (Last 30 Days)
        </h3>
        {stats.totalScans > 0 ? (
          <AuditFrequencyChart data={stats.scansByDay} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-zinc-500 dark:text-zinc-400">
            No scan data available yet
          </div>
        )}
      </div>
    </div>
  )
}) 
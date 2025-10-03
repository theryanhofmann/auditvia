'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Legacy components
import { FilterBar } from '@/app/components/reports/FilterBar'
import { AIInsightsPanel } from '@/app/components/reports/AIInsightsPanel'
import { ComplianceSummary } from '@/app/components/reports/ComplianceSummary'
import { BenchmarkCard } from '@/app/components/reports/BenchmarkCard'
import { ComplianceForecast } from '@/app/components/reports/ComplianceForecast'
import { InteractiveKPICards } from '@/app/components/reports/InteractiveKPICards'
import { ForecastingChart } from '@/app/components/reports/ForecastingChart'
import { TopRulesDonut } from '@/app/components/reports/TopRulesDonut'
import { TopPagesWidget } from '@/app/components/reports/TopPagesWidget'
import { RiskProjectionChart } from '@/app/components/reports/RiskProjectionChart'
import { SocialProofNotifications } from '@/app/components/reports/SocialProofNotifications'

// New enterprise components
import { StickyFilterBar } from '@/app/components/reports/StickyFilterBar'
import { InsightCard } from '@/app/components/reports/InsightCard'
import { BadgeRibbon } from '@/app/components/reports/BadgeRibbon'
// NotificationDrawer removed - replaced by global AI Engineer in dashboard layout
import { ExportMenu } from '@/app/components/reports/ExportMenu'

import {
  useKPIs,
  useTrend,
  useTopRules,
  useTopPages,
  useRisk
} from '@/hooks/useReportsData'
import { getDateRangeFromTimeRange } from '@/lib/reports-utils'
import { generateInsights } from '@/lib/insights-generator'
import {
  calculateBadgeMetrics,
  detectMilestones,
  storeBadgeMetrics,
  getPreviousBadgeMetrics,
  type BadgeMetrics
} from '@/lib/badge-calculator'
import type { ReportFilters, TimeRange, Severity } from '@/types/reports'
import { scanAnalytics } from '@/lib/safe-analytics'
import { designTokens, staggerContainer, staggerItem } from '@/app/components/reports/design-tokens'

interface EnhancedReportsClientProps {
  teamId: string
  sites: Array<{ id: string; name: string }>
}

export function EnhancedReportsClient({ teamId, sites }: EnhancedReportsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  // Initialize filters from URL or defaults
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const urlTimeRange = searchParams.get('timeRange') as TimeRange || '30d'
    const urlSiteId = searchParams.get('siteId') || undefined
    const urlSeverity = searchParams.get('severity') as Severity || undefined
    const urlStartDate = searchParams.get('startDate') || undefined
    const urlEndDate = searchParams.get('endDate') || undefined

    const { startDate, endDate } = urlStartDate && urlEndDate
      ? { startDate: urlStartDate, endDate: urlEndDate }
      : getDateRangeFromTimeRange(urlTimeRange)

    return {
      teamId,
      timeRange: urlTimeRange,
      siteId: urlSiteId,
      severity: urlSeverity,
      startDate,
      endDate
    }
  })

  // Sync filters to URL (preserve current path)
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('timeRange', filters.timeRange)
    if (filters.siteId) params.set('siteId', filters.siteId)
    if (filters.severity) params.set('severity', filters.severity)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)

    // Use current pathname to avoid redirecting from /dashboard to /dashboard/reports
    const targetPath = pathname || '/dashboard/reports'
    router.replace(`${targetPath}?${params.toString()}`, { scroll: false })
  }, [filters, router, pathname])

  // Update date range when time range preset changes
  useEffect(() => {
    if (filters.timeRange !== 'custom') {
      const { startDate, endDate } = getDateRangeFromTimeRange(filters.timeRange)
      setFilters(prev => ({ ...prev, startDate, endDate }))
    }
  }, [filters.timeRange])

  // Fetch data with current filters
  const kpis = useKPIs(filters)
  const trend = useTrend(filters)
  const topRules = useTopRules(filters)
  const topPages = useTopPages(filters)
  const risk = useRisk(filters)

  // Enterprise features state
  const [badgeMetrics, setBadgeMetrics] = useState<BadgeMetrics | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Generate insights
  const insights = useMemo(() => {
    return generateInsights(
      kpis.data,
      trend.data,
      topRules.data as any, // Type compatibility workaround
      (newFilters) => handleFiltersChange({ ...filters, ...newFilters })
    )
  }, [kpis.data, trend.data, topRules.data])

  // Calculate badge metrics
  useEffect(() => {
    if (!kpis.data) return

    calculateBadgeMetrics(teamId, kpis.data).then(metrics => {
      setBadgeMetrics(metrics)

      // Detect milestones
      const previousMetrics = getPreviousBadgeMetrics()
      const milestones = detectMilestones(metrics, previousMetrics)

      // Show milestone toasts
      milestones.forEach(milestone => {
        toast.success(`${milestone.title}\n${milestone.message}`, {
          duration: 3000,
          // No emoji - professional toast
        })
      })

      // Store for next comparison
      storeBadgeMetrics(metrics)
    })
  }, [kpis.data, teamId])

  // Track analytics
  useEffect(() => {
    scanAnalytics.track('reports_dashboard_viewed', {
      teamId,
      timeRange: filters.timeRange,
      siteId: filters.siteId,
      severity: filters.severity
    })
  }, [teamId, filters])

  const handleFiltersChange = (newFilters: ReportFilters) => {
    // Animated transition on filter change
    setIsTransitioning(true)
    setTimeout(() => setIsTransitioning(false), 300)

    setFilters(newFilters)
    scanAnalytics.track('reports_filters_changed', {
      timeRange: newFilters.timeRange,
      siteId: newFilters.siteId,
      severity: newFilters.severity
    })
  }

  const handleExport = (widgetName: string) => {
    scanAnalytics.track('reports_export', {
      widget: widgetName,
      format: 'csv',
      timeRange: filters.timeRange
    })
  }

  const handleExportAll = async () => {
    toast.loading('Preparing full dashboard export...')
    // TODO: Implement full export logic
    await new Promise(resolve => setTimeout(resolve, 2000))
    toast.success('Dashboard exported successfully!')
  }

  const handleBadgeEarned = (badge: any) => {
    // Show toast when badge is earned
    toast.success(`${badge.name}: ${badge.description}`, {
      duration: 5000,
      icon: '🎖️',
    })
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Professional Header (light theme) */}
        <div className="sticky top-0 z-[1100] bg-white/95 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-[1400px] mx-auto px-6 py-6">
            {/* Title + Export */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 mb-1.5">
                  Accessibility Reports
                </h1>
                <p className="text-sm text-gray-600">
                  Track violations, monitor progress, and reduce accessibility risk
                </p>
              </div>

              {/* Export All Button */}
              <ExportMenu
                onExportCSV={async () => {
                  await handleExportAll()
                }}
                label="Export"
                size="md"
              />
            </div>

            {/* Sticky Filter Bar */}
            <StickyFilterBar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              sites={sites}
            />

            {/* Badge Ribbon */}
            {badgeMetrics && (
              <div className="mt-4">
                <BadgeRibbon
                  currentMetrics={badgeMetrics}
                  onBadgeEarned={handleBadgeEarned}
                />
              </div>
            )}
          </div>
        </div>

        {/* Main content area (light theme, max-width for readability) */}
        <motion.div
          className="max-w-[1400px] mx-auto px-6 py-8 pb-24"
          variants={staggerContainer}
          initial="hidden"
          animate={isTransitioning ? "hidden" : "show"}
          transition={{ duration: 0.2 }}
        >
          {/* AI Insights Row (New!) */}
          {insights.length > 0 && (
            <motion.div variants={staggerItem} className="mb-8">
              <InsightCard
                insights={insights}
                rotationInterval={8000}
                maxVisible={3}
              />
            </motion.div>
          )}

          {/* Compliance Summary - CEO Briefing */}
          <motion.div variants={staggerItem}>
            <ComplianceSummary 
              kpiData={kpis.data}
              trendData={trend.data}
              timeRange={filters.timeRange}
            />
          </motion.div>

          {/* Legacy AI Insights + Forecast Row */}
          <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <AIInsightsPanel 
              kpiData={kpis.data}
              trendData={trend.data}
              topRules={topRules.data}
            />
            <ComplianceForecast trendData={trend.data} />
          </motion.div>

          {/* Benchmark Card */}
          <motion.div variants={staggerItem} className="mb-8">
            <BenchmarkCard kpiData={kpis.data} />
          </motion.div>

          {/* KPI Cards */}
          <motion.div variants={staggerItem}>
            <InteractiveKPICards data={kpis.data} loading={kpis.loading} />
          </motion.div>

          {/* Charts Grid */}
          <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Forecasting Chart - Full Width */}
            <div className="lg:col-span-3">
              <ForecastingChart
                data={trend.data}
                loading={trend.loading}
                onExport={() => handleExport('violations-forecast')}
              />
            </div>

            {/* Top Rules Donut - 2 cols */}
            <div className="lg:col-span-2">
              <TopRulesDonut
                data={topRules.data}
                loading={topRules.loading}
                onExport={() => handleExport('top-rules')}
              />
            </div>

            {/* Top Pages - 1 col */}
            <div className="lg:col-span-1">
              <TopPagesWidget
                data={topPages.data}
                loading={topPages.loading}
                onExport={() => handleExport('top-pages')}
              />
            </div>

            {/* Risk Projection Chart - Full Width */}
            <div className="lg:col-span-3">
              <RiskProjectionChart
                data={trend.data}
                loading={trend.loading}
                onExport={() => handleExport('risk-projection')}
              />
            </div>
          </motion.div>

          {/* Social Proof Notifications */}
          <motion.div variants={staggerItem}>
            <SocialProofNotifications />
          </motion.div>

          {/* Error States */}
          {(kpis.error || trend.error || topRules.error || topPages.error || risk.error) && (
            <motion.div
              variants={staggerItem}
              className="bg-red-900/20 border border-red-700 rounded-lg p-4"
            >
              <p className="text-red-400 text-sm">
                Some widgets failed to load. Please try refreshing the page or adjusting your filters.
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Notification drawer removed - replaced by global AI Engineer in dashboard layout */}
    </>
  )
}

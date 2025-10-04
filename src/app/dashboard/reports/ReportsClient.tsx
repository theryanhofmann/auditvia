'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilterBar } from '@/app/components/reports/FilterBar'
import { KPICards } from '@/app/components/reports/KPICards'
import { ViolationsTrendChart } from '@/app/components/reports/ViolationsTrendChart'
import { TopRulesWidget } from '@/app/components/reports/TopRulesWidget'
import { TopPagesWidget } from '@/app/components/reports/TopPagesWidget'
import { RiskReducedChart } from '@/app/components/reports/RiskReducedChart'
import {
  useKPIs,
  useTrend,
  useTopRules,
  useTopPages,
  useRisk
} from '@/hooks/useReportsData'
import { getDateRangeFromTimeRange } from '@/lib/reports-utils'
import type { ReportFilters, TimeRange, Severity } from '@/types/reports'
import { scanAnalytics } from '@/lib/safe-analytics'

interface ReportsClientProps {
  teamId: string
  sites: Array<{ id: string; name: string }>
}

export function ReportsClient({ teamId, sites }: ReportsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
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

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('timeRange', filters.timeRange)
    if (filters.siteId) params.set('siteId', filters.siteId)
    if (filters.severity) params.set('severity', filters.severity)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)

    router.replace(`/dashboard/reports?${params.toString()}`, { scroll: false })
  }, [filters, router])

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

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Accessibility Reports</h1>
          <p className="text-gray-400">
            Track violations, monitor progress, and reduce accessibility risk across your sites
          </p>
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          sites={sites}
        />

        {/* KPI Cards */}
        <KPICards data={kpis.data} loading={kpis.loading} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Violations Trend */}
          <div className="lg:col-span-2">
            <ViolationsTrendChart
              data={trend.data}
              loading={trend.loading}
              onExport={() => handleExport('violations-trend')}
            />
          </div>

          {/* Top Rules */}
          <TopRulesWidget
            data={topRules.data}
            loading={topRules.loading}
            onExport={() => handleExport('top-rules')}
          />

          {/* Top Pages */}
          <TopPagesWidget
            data={topPages.data}
            loading={topPages.loading}
            onExport={() => handleExport('top-pages')}
          />

          {/* Risk Reduced */}
          <div className="lg:col-span-2">
            <RiskReducedChart
              data={risk.data}
              loading={risk.loading}
              onExport={() => handleExport('risk-reduced')}
            />
          </div>
        </div>

        {/* Error States */}
        {(kpis.error || trend.error || topRules.error || topPages.error || risk.error) && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-400 text-sm">
              Some widgets failed to load. Please try refreshing the page or adjusting your filters.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

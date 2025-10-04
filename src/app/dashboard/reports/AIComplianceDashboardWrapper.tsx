'use client'

import { useState } from 'react'
import { AIComplianceDashboard } from '@/app/components/reports/AIComplianceDashboard'
import {
  useKPIs,
  useTrend,
  useTopRules,
} from '@/hooks/useReportsData'
import { getDateRangeFromTimeRange } from '@/lib/reports-utils'
import type { ReportFilters } from '@/types/reports'

interface AIComplianceDashboardWrapperProps {
  teamId: string
  sites: Array<{ id: string; name: string }>
}

export function AIComplianceDashboardWrapper({
  teamId,
  sites: _sites
}: AIComplianceDashboardWrapperProps) {
  const [filters] = useState<ReportFilters>(() => {
    const { startDate, endDate } = getDateRangeFromTimeRange('30d')
    return {
      teamId,
      timeRange: '30d',
      startDate,
      endDate
    }
  })

  // Fetch data
  const kpis = useKPIs(filters)
  const trend = useTrend(filters)
  const topRules = useTopRules(filters)

  const loading = kpis.loading || trend.loading || topRules.loading

  return (
    <AIComplianceDashboard
      kpiData={kpis.data}
      trendData={trend.data}
      topRules={topRules.data}
      loading={loading}
      teamId={teamId}
    />
  )
}


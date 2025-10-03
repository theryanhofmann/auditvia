/**
 * Custom hooks for fetching reports data
 */

import { useState, useEffect, useCallback } from 'react'
import type {
  ReportFilters,
  ApiResponse,
  KPIData,
  TrendDataPoint,
  TopRule,
  TopPage,
  FixThroughput,
  BacklogItem,
  CoverageData,
  TicketData,
  RiskData,
  FalsePositiveData
} from '@/types/reports'

interface UseReportsDataReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

function buildQueryString(filters: ReportFilters): string {
  const params = new URLSearchParams({ teamId: filters.teamId })
  
  if (filters.siteId) params.set('siteId', filters.siteId)
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.severity) params.set('severity', filters.severity)
  if (filters.wcagLevel) params.set('wcagLevel', filters.wcagLevel)
  
  return params.toString()
}

function useReportsEndpoint<T>(
  endpoint: string,
  filters: ReportFilters,
  enabled: boolean = true
): UseReportsDataReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) return

    // Abort previous request
    if (abortController) {
      abortController.abort()
    }

    const controller = new AbortController()
    setAbortController(controller)
    setLoading(true)
    setError(null)

    try {
      const queryString = buildQueryString(filters)
      const response = await fetch(`/api/reports/${endpoint}?${queryString}`, {
        signal: controller.signal
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch data')
      }

      const result: ApiResponse<T> = await response.json()
      setData(result.data)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'An error occurred')
        console.error(`[useReportsData] Error fetching ${endpoint}:`, err)
      }
    } finally {
      setLoading(false)
    }
  }, [endpoint, filters, enabled])

  useEffect(() => {
    fetchData()
    
    return () => {
      if (abortController) {
        abortController.abort()
      }
    }
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export function useKPIs(filters: ReportFilters) {
  return useReportsEndpoint<KPIData>('kpis', filters)
}

export function useTrend(filters: ReportFilters) {
  return useReportsEndpoint<TrendDataPoint[]>('trend', filters)
}

export function useTopRules(filters: ReportFilters) {
  return useReportsEndpoint<TopRule[]>('top-rules', filters)
}

export function useTopPages(filters: ReportFilters) {
  return useReportsEndpoint<TopPage[]>('top-pages', filters)
}

export function useFixThroughput(filters: ReportFilters) {
  return useReportsEndpoint<FixThroughput[]>('fixes', filters)
}

export function useBacklog(filters: ReportFilters) {
  return useReportsEndpoint<BacklogItem[]>('backlog', filters)
}

export function useCoverage(filters: ReportFilters) {
  return useReportsEndpoint<CoverageData[]>('coverage', filters)
}

export function useTickets(filters: ReportFilters) {
  return useReportsEndpoint<TicketData[]>('tickets', filters)
}

export function useRisk(filters: ReportFilters) {
  return useReportsEndpoint<RiskData[]>('risk', filters)
}

export function useFalsePositives(filters: ReportFilters) {
  return useReportsEndpoint<FalsePositiveData[]>('false-positives', filters)
}

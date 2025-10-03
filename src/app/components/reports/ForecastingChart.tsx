'use client'

import { useMemo } from 'react'
import { TrendingUp, Info } from 'lucide-react'
import { getSeverityColor } from '@/lib/reports-utils'
import type { TrendDataPoint } from '@/types/reports'

interface ForecastingChartProps {
  data: TrendDataPoint[] | null
  loading: boolean
  onExport?: () => void
}

interface ForecastPoint extends TrendDataPoint {
  is_forecast: boolean
}

export function ForecastingChart({ data, loading, onExport }: ForecastingChartProps) {
  const { chartData, maxValue, forecastStartIndex } = useMemo(() => {
    if (!data || data.length < 3) {
      return { chartData: [], maxValue: 0, forecastStartIndex: 0 }
    }

    // Calculate trend velocity for forecasting
    const recentData = data.slice(-7) // Last 7 days
    const velocities: Array<{
      critical: number
      serious: number
      moderate: number
      minor: number
    }> = []
    
    for (let i = 1; i < recentData.length; i++) {
      const prev = recentData[i - 1]
      const curr = recentData[i]
      velocities.push({
        critical: curr.critical_count - prev.critical_count,
        serious: curr.serious_count - prev.serious_count,
        moderate: curr.moderate_count - prev.moderate_count,
        minor: curr.minor_count - prev.minor_count
      })
    }

    // Average velocity per severity
    const avgVelocity = {
      critical: velocities.reduce((sum, v) => sum + v.critical, 0) / velocities.length,
      serious: velocities.reduce((sum, v) => sum + v.serious, 0) / velocities.length,
      moderate: velocities.reduce((sum, v) => sum + v.moderate, 0) / velocities.length,
      minor: velocities.reduce((sum, v) => sum + v.minor, 0) / velocities.length
    }

    // Generate 30-day forecast
    const lastPoint = data[data.length - 1]
    const forecastPoints: ForecastPoint[] = []
    const forecastDays = 30

    for (let day = 1; day <= forecastDays; day++) {
      const date = new Date(lastPoint.date)
      date.setDate(date.getDate() + day)

      const critical = Math.max(0, Math.round(lastPoint.critical_count + (avgVelocity.critical * day)))
      const serious = Math.max(0, Math.round(lastPoint.serious_count + (avgVelocity.serious * day)))
      const moderate = Math.max(0, Math.round(lastPoint.moderate_count + (avgVelocity.moderate * day)))
      const minor = Math.max(0, Math.round(lastPoint.minor_count + (avgVelocity.minor * day)))

      forecastPoints.push({
        date: date.toISOString().split('T')[0],
        critical_count: critical,
        serious_count: serious,
        moderate_count: moderate,
        minor_count: minor,
        total_violations: critical + serious + moderate + minor,
        scan_count: 0,
        is_forecast: true
      })
    }

    const allData = [
      ...data.map(d => ({ ...d, is_forecast: false })),
      ...forecastPoints
    ]

    const max = Math.max(...allData.map(d => d.total_violations))

    return {
      chartData: allData,
      maxValue: max,
      forecastStartIndex: data.length - 1
    }
  }, [data])

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse">
        <div className="h-80 bg-gray-700 rounded" />
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <p className="text-gray-600 text-center py-12">No trend data available</p>
      </div>
    )
  }

  const barWidth = 100 / chartData.length
  const forecastWarning = chartData[chartData.length - 1].total_violations > chartData[forecastStartIndex].total_violations

  return (
    <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-lg p-6 border border-gray-200 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/20">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Violations Over Time + Forecast</h3>
            <p className="text-sm text-gray-600">Historical trends with 30-day projection</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            className="group relative p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Forecast explanation"
          >
            <Info className="w-5 h-5 text-gray-600" />
            <div className="absolute right-0 top-full mt-2 w-64 bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
              <p className="text-xs text-gray-700">
                Forecast calculated using 7-day moving average of violation velocity. 
                Dashed lines show projected trends based on recent fix rates.
              </p>
            </div>
          </button>
          {onExport && (
            <button
              onClick={onExport}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-700 transition-colors"
            >
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Forecast Warning */}
      {forecastWarning && (
        <div className="mb-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="text-amber-400">⚠️</span>
          <p className="text-sm text-amber-300">
            Forecast shows increasing violations. Consider accelerating fix rate.
          </p>
        </div>
      )}

      {/* Chart */}
      <div className="relative h-80 mt-6">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue * 0.75)}</span>
          <span>{Math.round(maxValue * 0.5)}</span>
          <span>{Math.round(maxValue * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-12 mr-4 h-full flex items-end gap-0.5 relative">
          {/* Forecast divider */}
          <div
            className="absolute top-0 bottom-8 border-l-2 border-dashed border-cyan-500/30 z-10"
            style={{ left: `${forecastStartIndex * barWidth}%` }}
          >
            <span className="absolute -top-6 left-2 text-xs text-cyan-400 font-medium whitespace-nowrap">
              🔮 Forecast Begins
            </span>
          </div>

          {chartData.map((point, idx) => {
            const total = point.total_violations
            const heightPercent = (total / maxValue) * 100

            return (
              <div
                key={point.date}
                className="group relative flex-1 flex flex-col justify-end"
                style={{ height: '100%' }}
              >
                {/* Stacked bars */}
                <div
                  className={`relative w-full flex flex-col justify-end transition-all duration-300 ${
                    point.is_forecast ? 'opacity-60' : 'opacity-100'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                >
                  {/* Critical */}
                  {point.critical_count > 0 && (
                    <div
                      className={`w-full ${point.is_forecast ? 'bg-red-500/50 border border-red-400/30' : 'bg-red-500'}`}
                      style={{
                        height: `${(point.critical_count / total) * 100}%`
                      }}
                    />
                  )}
                  {/* Serious */}
                  {point.serious_count > 0 && (
                    <div
                      className={`w-full ${point.is_forecast ? 'bg-orange-500/50 border border-orange-400/30' : 'bg-orange-500'}`}
                      style={{
                        height: `${(point.serious_count / total) * 100}%`
                      }}
                    />
                  )}
                  {/* Moderate */}
                  {point.moderate_count > 0 && (
                    <div
                      className={`w-full ${point.is_forecast ? 'bg-amber-500/50 border border-amber-400/30' : 'bg-amber-500'}`}
                      style={{
                        height: `${(point.moderate_count / total) * 100}%`
                      }}
                    />
                  )}
                  {/* Minor */}
                  {point.minor_count > 0 && (
                    <div
                      className={`w-full ${point.is_forecast ? 'bg-blue-500/50 border border-blue-400/30' : 'bg-blue-500'}`}
                      style={{
                        height: `${(point.minor_count / total) * 100}%`
                      }}
                    />
                  )}
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 shadow-xl whitespace-nowrap">
                    <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                      {point.is_forecast && <span className="text-cyan-400">🔮</span>}
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {point.is_forecast && <span className="text-cyan-400 ml-1">(Forecast)</span>}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-xs text-gray-700">Critical: {point.critical_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-xs text-gray-700">Serious: {point.serious_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-xs text-gray-700">Moderate: {point.moderate_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs text-gray-700">Minor: {point.minor_count}</span>
                      </div>
                      <div className="mt-1 pt-1 border-t border-gray-200">
                        <span className="text-xs font-medium text-gray-900">Total: {total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* X-axis */}
        <div className="ml-12 mr-4 mt-2 flex justify-between text-xs text-gray-500">
          <span>{chartData[0] ? new Date(chartData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          <span>{chartData[forecastStartIndex] ? new Date(chartData[forecastStartIndex].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          <span>{chartData[chartData.length - 1] ? new Date(chartData[chartData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-xs text-gray-600">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span className="text-xs text-gray-600">Serious</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-xs text-gray-600">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-xs text-gray-600">Minor</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-dashed border-cyan-500/50 bg-cyan-500/20" />
          <span className="text-xs text-gray-600">Forecasted</span>
        </div>
      </div>
    </div>
  )
}

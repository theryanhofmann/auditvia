'use client'

import { Download } from 'lucide-react'
import { exportToCSV } from '@/lib/reports-utils'
import type { TrendDataPoint } from '@/types/reports'

interface ViolationsTrendChartProps {
  data: TrendDataPoint[] | null
  loading: boolean
  onExport?: () => void
}

export function ViolationsTrendChart({ data, loading, onExport }: ViolationsTrendChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-gray-900">Violations Over Time</h3>
        </div>
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-gray-500">No violation data available for this time range</p>
        </div>
      </div>
    )
  }

  const handleExport = () => {
    if (!data) return
    exportToCSV(data, 'violations-trend', [
      { key: 'date', label: 'Date' },
      { key: 'critical_count', label: 'Critical' },
      { key: 'serious_count', label: 'Serious' },
      { key: 'moderate_count', label: 'Moderate' },
      { key: 'minor_count', label: 'Minor' },
      { key: 'total_violations', label: 'Total' }
    ])
    onExport?.()
  }

  const maxValue = Math.max(...data.map(d => d.total_violations), 1)

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-900">Violations Over Time</h3>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
          aria-label="Export violation trend data to CSV"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Stacked Area Chart */}
      <div className="relative h-64">
        <div className="absolute inset-0 flex items-end justify-between gap-2 pb-8">
          {data.map((point, index) => {
            const total = point.total_violations || 1
            const heightPercent = (total / maxValue) * 100

            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full flex flex-col justify-end" 
                  style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  role="img"
                  aria-label={`${new Date(point.date).toLocaleDateString()}: ${total} violations`}
                >
                  {point.critical_count > 0 && (
                    <div
                      className="w-full bg-red-600 hover:bg-red-500 transition-colors"
                      style={{ 
                        height: `${(point.critical_count / total) * 100}%`,
                        minHeight: point.critical_count > 0 ? '2px' : '0'
                      }}
                      title={`Critical: ${point.critical_count}`}
                    />
                  )}
                  {point.serious_count > 0 && (
                    <div
                      className="w-full bg-orange-600 hover:bg-orange-500 transition-colors"
                      style={{ 
                        height: `${(point.serious_count / total) * 100}%`,
                        minHeight: point.serious_count > 0 ? '2px' : '0'
                      }}
                      title={`Serious: ${point.serious_count}`}
                    />
                  )}
                  {point.moderate_count > 0 && (
                    <div
                      className="w-full bg-amber-500 hover:bg-amber-400 transition-colors"
                      style={{ 
                        height: `${(point.moderate_count / total) * 100}%`,
                        minHeight: point.moderate_count > 0 ? '2px' : '0'
                      }}
                      title={`Moderate: ${point.moderate_count}`}
                    />
                  )}
                  {point.minor_count > 0 && (
                    <div
                      className="w-full bg-blue-500 hover:bg-blue-400 transition-colors rounded-t"
                      style={{ 
                        height: `${(point.minor_count / total) * 100}%`,
                        minHeight: point.minor_count > 0 ? '2px' : '0'
                      }}
                      title={`Minor: ${point.minor_count}`}
                    />
                  )}
                </div>
                <span className="text-xs text-gray-500 rotate-45 origin-top-left whitespace-nowrap">
                  {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600" />
          <span className="text-sm text-gray-600">Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-600" />
          <span className="text-sm text-gray-600">Serious</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-sm text-gray-600">Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-600">Minor</span>
        </div>
      </div>

      {/* Screen reader summary */}
      <div className="sr-only">
        <p>Violations trend over {data.length} data points</p>
        <p>Total violations range from {Math.min(...data.map(d => d.total_violations))} to {maxValue}</p>
      </div>
    </div>
  )
}

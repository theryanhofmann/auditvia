'use client'

import { useState, useEffect } from 'react'
import { Download, ZoomIn, Eye, EyeOff } from 'lucide-react'
import { exportToCSV } from '@/lib/reports-utils'
import type { TrendDataPoint } from '@/types/reports'

interface EnhancedViolationsTrendProps {
  data: TrendDataPoint[] | null
  loading: boolean
  onExport?: () => void
}

const severities = [
  { key: 'critical_count' as const, label: 'Critical', color: '#DC2626' },
  { key: 'serious_count' as const, label: 'Serious', color: '#EA580C' },
  { key: 'moderate_count' as const, label: 'Moderate', color: '#F59E0B' },
  { key: 'minor_count' as const, label: 'Minor', color: '#3B82F6' }
]

export function EnhancedViolationsTrend({ data, loading, onExport }: EnhancedViolationsTrendProps) {
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(new Set(['critical_count', 'serious_count', 'moderate_count', 'minor_count']))
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-6"></div>
        <div className="h-80 bg-gray-700 rounded"></div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Violations Over Time</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-2">No violation data available</p>
            <p className="text-sm text-gray-600">Try adjusting your filters</p>
          </div>
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

  const toggleSeries = (key: string) => {
    const newVisible = new Set(visibleSeries)
    if (newVisible.has(key)) {
      newVisible.delete(key)
    } else {
      newVisible.add(key)
    }
    setVisibleSeries(newVisible)
  }

  const maxValue = Math.max(
    ...data.map(d => 
      severities.reduce((sum, s) => sum + (visibleSeries.has(s.key) ? d[s.key] : 0), 0)
    ),
    1
  )

  return (
    <div className={`bg-gray-800 rounded-xl p-6 border border-gray-700 transition-all duration-500 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Violations Over Time</h3>
          <p className="text-sm text-gray-500">Stacked by severity across {data.length} days</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Export violation trend data to CSV"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Chart */}
      <div className="relative h-80 mb-6" role="img" aria-label="Violations trend chart">
        <div className="absolute inset-0 flex items-end justify-between gap-1">
          {data.map((point, index) => {
            const total = severities.reduce((sum, s) => sum + (visibleSeries.has(s.key) ? point[s.key] : 0), 0)
            const heightPercent = (total / maxValue) * 100

            return (
              <div 
                key={index} 
                className="flex-1 flex flex-col items-center gap-2 group"
                onMouseEnter={() => setHoveredPoint(index)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <div 
                  className="w-full flex flex-col-reverse justify-start transition-all duration-300 ease-out relative"
                  style={{ height: `${Math.max(heightPercent, 2)}%` }}
                >
                  {severities.map((severity) => {
                    if (!visibleSeries.has(severity.key)) return null
                    const count = point[severity.key]
                    if (count === 0) return null
                    
                    const segmentHeight = total > 0 ? (count / total) * 100 : 0
                    
                    return (
                      <div
                        key={severity.key}
                        className="w-full transition-all duration-300 hover:brightness-110"
                        style={{ 
                          backgroundColor: severity.color,
                          height: `${segmentHeight}%`,
                          minHeight: count > 0 ? '2px' : '0'
                        }}
                        title={`${severity.label}: ${count}`}
                      />
                    )
                  })}
                </div>

                {/* Hover tooltip */}
                {hoveredPoint === index && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl z-10 min-w-[160px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="text-xs font-medium text-gray-400 mb-2">
                      {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="space-y-1">
                      {severities.map(severity => (
                        visibleSeries.has(severity.key) && point[severity.key] > 0 && (
                          <div key={severity.key} className="flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: severity.color }}
                              />
                              <span className="text-gray-300">{severity.label}</span>
                            </div>
                            <span className="font-semibold text-white">{point[severity.key]}</span>
                          </div>
                        )
                      ))}
                      <div className="flex items-center justify-between gap-3 text-xs pt-1 mt-1 border-t border-gray-700">
                        <span className="text-gray-400">Total</span>
                        <span className="font-bold text-white">{total}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Y-axis labels */}
        <div className="absolute -left-12 inset-y-0 flex flex-col justify-between text-xs text-gray-600">
          <span>{Math.round(maxValue)}</span>
          <span>{Math.round(maxValue * 0.5)}</span>
          <span>0</span>
        </div>
      </div>

      {/* Legend with toggle */}
      <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-700">
        {severities.map(severity => (
          <button
            key={severity.key}
            onClick={() => toggleSeries(severity.key)}
            className={`flex items-center gap-2 transition-opacity ${
              visibleSeries.has(severity.key) ? 'opacity-100' : 'opacity-40'
            }`}
          >
            <div 
              className="w-3 h-3 rounded-full transition-transform hover:scale-110" 
              style={{ backgroundColor: severity.color }}
            />
            <span className="text-sm text-gray-400">{severity.label}</span>
            {!visibleSeries.has(severity.key) && (
              <EyeOff className="w-3 h-3 text-gray-600" />
            )}
          </button>
        ))}
      </div>

      {/* Screen reader summary */}
      <div className="sr-only">
        <p>Violations trend over {data.length} data points</p>
        <p>Maximum value: {maxValue}</p>
      </div>
    </div>
  )
}

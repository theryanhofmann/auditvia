'use client'

import { Download, TrendingUp, TrendingDown } from 'lucide-react'
import { exportToCSV, formatCurrency, getSeverityColor } from '@/lib/reports-utils'
import type { RiskData } from '@/types/reports'

interface RiskReducedChartProps {
  data: RiskData[] | null
  loading: boolean
  onExport?: () => void
}

export function RiskReducedChart({ data, loading, onExport }: RiskReducedChartProps) {
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
        <h3 className="text-base font-semibold text-gray-900 mb-6">Accessibility Risk Reduced</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-sm text-gray-500">No risk data available</p>
        </div>
      </div>
    )
  }

  const handleExport = () => {
    if (!data) return
    exportToCSV(data, 'risk-reduced', [
      { key: 'date', label: 'Date' },
      { key: 'severity', label: 'Severity' },
      { key: 'current_risk', label: 'Current Risk ($)' },
      { key: 'previous_risk', label: 'Previous Risk ($)' },
      { key: 'risk_reduced', label: 'Risk Reduced ($)' }
    ])
    onExport?.()
  }

  // Aggregate by date for total risk reduced
  const riskByDate = data.reduce((acc, item) => {
    const existing = acc.find(x => x.date === item.date)
    if (existing) {
      existing.risk_reduced += item.risk_reduced
      existing.current_risk += item.current_risk
    } else {
      acc.push({
        date: item.date,
        risk_reduced: item.risk_reduced,
        current_risk: item.current_risk
      })
    }
    return acc
  }, [] as Array<{ date: string; risk_reduced: number; current_risk: number }>)

  riskByDate.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const totalRiskReduced = riskByDate.reduce((sum, item) => sum + Math.max(0, item.risk_reduced), 0)
  const currentTotalRisk = riskByDate[riskByDate.length - 1]?.current_risk || 0
  const previousTotalRisk = riskByDate[0]?.current_risk || 0
  const percentChange = previousTotalRisk > 0 
    ? ((currentTotalRisk - previousTotalRisk) / previousTotalRisk) * 100 
    : 0

  const maxRisk = Math.max(...riskByDate.map(d => Math.max(d.current_risk, d.risk_reduced)), 1)

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Accessibility Risk Reduced</h3>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm text-gray-600">
              {formatCurrency(totalRiskReduced)} risk reduced
            </span>
            {percentChange !== 0 && (
              <span className={`text-sm font-medium flex items-center gap-1 ${
                percentChange < 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {percentChange < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                )}
                {Math.abs(percentChange).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
          aria-label="Export risk data to CSV"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Area Chart */}
      <div className="relative h-64">
        <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
          {/* Grid lines */}
          <g className="text-gray-200">
            <line x1="0" y1="50" x2="600" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.8" />
            <line x1="0" y1="100" x2="600" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.8" />
            <line x1="0" y1="150" x2="600" y2="150" stroke="currentColor" strokeWidth="1" opacity="0.8" />
          </g>

          {/* Area fill */}
          {riskByDate.length > 1 && (
            <path
              d={`M 0 200 ${riskByDate.map((d, i) => {
                const x = (i / (riskByDate.length - 1)) * 600
                const y = 200 - ((d.current_risk / maxRisk) * 180)
                return `L ${x} ${y}`
              }).join(' ')} L 600 200 Z`}
              fill="url(#riskGradient)"
              opacity="0.3"
            />
          )}

          {/* Line */}
          {riskByDate.length > 1 && (
            <path
              d={`M ${riskByDate.map((d, i) => {
                const x = (i / (riskByDate.length - 1)) * 600
                const y = 200 - ((d.current_risk / maxRisk) * 180)
                return `${x} ${y}`
              }).join(' L ')}`}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {riskByDate.map((d, i) => {
            const x = riskByDate.length > 1 ? (i / (riskByDate.length - 1)) * 600 : 300
            const y = 200 - ((d.current_risk / maxRisk) * 180)
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#3B82F6"
                className="hover:r-6 transition-all"
              />
            )
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="riskGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-4">
          {riskByDate.map((d, i) => (
            i % Math.max(1, Math.floor(riskByDate.length / 6)) === 0 && (
              <span key={i} className="text-xs text-gray-500">
                {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 mb-3">Risk Model: Critical=$10k, Serious=$5k, Moderate=$1k, Minor=$100</p>
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-600" />
            <span className="text-sm text-gray-400">Current Risk</span>
          </div>
        </div>
      </div>

      {/* Screen reader summary */}
      <div className="sr-only">
        <p>Risk reduced over {riskByDate.length} data points</p>
        <p>Total risk reduced: {formatCurrency(totalRiskReduced)}</p>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Download, TrendingUp, TrendingDown, DollarSign, Info } from 'lucide-react'
import { exportToCSV } from '@/lib/reports-utils'
import { AnimatedNumber } from './AnimatedNumber'
import type { RiskData } from '@/types/reports'

interface EnhancedRiskChartProps {
  data: RiskData[] | null
  loading: boolean
  onExport?: () => void
}

export function EnhancedRiskChart({ data, loading, onExport }: EnhancedRiskChartProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 600)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-850 rounded-2xl p-6 border border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-6"></div>
        <div className="h-80 bg-gray-700 rounded"></div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-850 rounded-2xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-6">Accessibility Risk Reduced</h3>
        <div className="h-80 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-gray-400 mb-2 text-center">No risk data yet</p>
          <p className="text-sm text-gray-600 text-center max-w-md">
            Run more scans to track your risk reduction progress and see potential cost savings.
          </p>
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

  // Aggregate by date
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

  const maxRisk = Math.max(...riskByDate.map(d => Math.max(d.current_risk, Math.abs(d.risk_reduced))), 1)

  return (
    <div className={`bg-gradient-to-br from-gray-800 to-gray-850 rounded-2xl p-6 border border-gray-700 transition-all duration-500 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
    }`}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-3">Accessibility Risk Reduced</h3>
          
          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
              <div className="text-xs text-gray-500 mb-1">Total Reduced</div>
              <div className="text-2xl font-bold text-green-400">
                <AnimatedNumber value={totalRiskReduced} prefix="$" decimals={0} />
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
              <div className="text-xs text-gray-500 mb-1">Current Risk</div>
              <div className="text-2xl font-bold text-white">
                <AnimatedNumber value={currentTotalRisk} prefix="$" decimals={0} />
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
              <div className="text-xs text-gray-500 mb-1">Change</div>
              <div className={`text-2xl font-bold flex items-center gap-1 ${
                percentChange < 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {percentChange < 0 ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                <AnimatedNumber value={Math.abs(percentChange)} decimals={1} suffix="%" />
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Export risk data to CSV"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Area Chart */}
      <div className="relative h-64 mb-6">
        <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
          {/* Grid lines */}
          <g className="text-gray-700">
            {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
              <line
                key={i}
                x1="0"
                y1={fraction * 200}
                x2="600"
                y2={fraction * 200}
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.2"
              />
            ))}
          </g>

          {/* Gradient definition */}
          <defs>
            <linearGradient id="riskGradient" x1="0" x2="0" y1="0" y2="1">
              <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.05" />
              </linearGradient>
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Area fill */}
          {riskByDate.length > 1 && (
            <path
              d={`M 0 200 ${riskByDate.map((d, i) => {
                const x = (i / (riskByDate.length - 1)) * 600
                const y = 200 - ((d.current_risk / maxRisk) * 180)
                return `L ${x} ${y}`
              }).join(' ')} L 600 200 Z`}
              fill="url(#areaGradient)"
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
              stroke="#10B981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
            />
          )}

          {/* Data points */}
          {riskByDate.map((d, i) => {
            const x = riskByDate.length > 1 ? (i / (riskByDate.length - 1)) * 600 : 300
            const y = 200 - ((d.current_risk / maxRisk) * 180)
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={hoveredPoint === i ? 6 : 4}
                  fill="#10B981"
                  className="transition-all duration-200"
                  filter={hoveredPoint === i ? 'url(#glow)' : undefined}
                />
                {hoveredPoint === i && (
                  <g>
                    <rect
                      x={x - 60}
                      y={y - 50}
                      width="120"
                      height="40"
                      rx="6"
                      fill="#1F2937"
                      stroke="#374151"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={y - 30}
                      textAnchor="middle"
                      className="text-xs fill-gray-400"
                    >
                      {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </text>
                    <text
                      x={x}
                      y={y - 15}
                      textAnchor="middle"
                      className="text-sm font-bold fill-white"
                    >
                      ${Math.round(d.current_risk).toLocaleString()}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Risk model legend */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
        <div className="flex items-start gap-2 mb-2">
          <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-500">
            <span className="font-medium text-gray-400">Risk Model:</span> Critical=$10k · Serious=$5k · Moderate=$1k · Minor=$100
          </div>
        </div>
      </div>
    </div>
  )
}

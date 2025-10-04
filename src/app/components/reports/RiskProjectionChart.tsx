'use client'

import { useMemo } from 'react'
import { DollarSign, Info, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/reports-utils'
import { RESEARCH_BASED_WEIGHTS } from '@/lib/risk-methodology'
import { RiskDisclaimer } from '@/app/components/ui/RiskDisclaimer'
import type { TrendDataPoint } from '@/types/reports'

interface RiskProjectionChartProps {
  data: TrendDataPoint[] | null
  loading: boolean
  onExport?: () => void
}

interface RiskPoint {
  date: string
  risk: number
  is_forecast: boolean
}

// Use research-based risk weights
const RISK_WEIGHTS = RESEARCH_BASED_WEIGHTS

export function RiskProjectionChart({ data, loading, onExport }: RiskProjectionChartProps) {
  const { chartData, maxRisk, currentRisk, projectedRisk, forecastStartIndex } = useMemo(() => {
    if (!data || data.length < 3) {
      return { chartData: [], maxRisk: 0, currentRisk: 0, projectedRisk: 0, forecastStartIndex: 0 }
    }

    // Calculate historical risk
    const historicalRisk: RiskPoint[] = data.map(point => ({
      date: point.date,
      risk: 
        point.critical_count * RISK_WEIGHTS.critical +
        point.serious_count * RISK_WEIGHTS.serious +
        point.moderate_count * RISK_WEIGHTS.moderate +
        point.minor_count * RISK_WEIGHTS.minor,
      is_forecast: false
    }))

    // Calculate trend velocity
    const recentData = data.slice(-7)
    const velocities: number[] = []
    
    for (let i = 1; i < recentData.length; i++) {
      const prev = recentData[i - 1]
      const curr = recentData[i]
      
      const prevRisk = 
        prev.critical_count * RISK_WEIGHTS.critical +
        prev.serious_count * RISK_WEIGHTS.serious +
        prev.moderate_count * RISK_WEIGHTS.moderate +
        prev.minor_count * RISK_WEIGHTS.minor
      
      const currRisk = 
        curr.critical_count * RISK_WEIGHTS.critical +
        curr.serious_count * RISK_WEIGHTS.serious +
        curr.moderate_count * RISK_WEIGHTS.moderate +
        curr.minor_count * RISK_WEIGHTS.minor
      
      velocities.push(currRisk - prevRisk)
    }

    const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length

    // Generate 30-day forecast
    const lastPoint = historicalRisk[historicalRisk.length - 1]
    const forecastPoints: RiskPoint[] = []
    const forecastDays = 30

    for (let day = 1; day <= forecastDays; day++) {
      const date = new Date(lastPoint.date)
      date.setDate(date.getDate() + day)

      const projectedRiskValue = Math.max(0, lastPoint.risk + (avgVelocity * day))

      forecastPoints.push({
        date: date.toISOString().split('T')[0],
        risk: Math.round(projectedRiskValue),
        is_forecast: true
      })
    }

    const allData = [...historicalRisk, ...forecastPoints]
    const max = Math.max(...allData.map(d => d.risk))
    const current = lastPoint.risk
    const projected = forecastPoints[forecastPoints.length - 1]?.risk || current

    return {
      chartData: allData,
      maxRisk: max,
      currentRisk: current,
      projectedRisk: projected,
      forecastStartIndex: historicalRisk.length - 1
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
        <p className="text-gray-600 text-center py-12">No risk data available</p>
      </div>
    )
  }

  const riskIncreasing = projectedRisk > currentRisk
  const riskChange = projectedRisk - currentRisk

  return (
    <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-lg p-6 border border-gray-200 relative overflow-hidden">
      {/* Decorative gradient */}
      <div className={`absolute top-0 right-0 w-96 h-96 ${
        riskIncreasing ? 'bg-gradient-to-br from-red-500/10 to-orange-500/5' : 'bg-gradient-to-br from-green-500/10 to-emerald-500/5'
      } rounded-full blur-3xl`} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${
              riskIncreasing ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20' : 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20'
            } flex items-center justify-center`}>
              <DollarSign className={`w-5 h-5 ${riskIncreasing ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Accessibility Risk Projection</h3>
              <p className="text-sm text-gray-600">Current exposure + 30-day forecast</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className="group relative p-2 hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Risk calculation explanation"
            >
              <Info className="w-5 h-5 text-gray-600" />
              <div className="absolute right-0 top-full mt-2 w-72 bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                <p className="text-xs text-gray-700 mb-2">
                  <strong>Risk Model ($/violation):</strong>
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Critical: {formatCurrency(RISK_WEIGHTS.critical)}</li>
                  <li>• Serious: {formatCurrency(RISK_WEIGHTS.serious)}</li>
                  <li>• Moderate: {formatCurrency(RISK_WEIGHTS.moderate)}</li>
                  <li>• Minor: {formatCurrency(RISK_WEIGHTS.minor)}</li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  Based on typical ADA settlement ranges. Forecast uses 7-day velocity.
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

        {/* Risk Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Risk</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(currentRisk)}</div>
            <div className="text-xs text-gray-500 mt-1">🛡️ Active exposure</div>
          </div>

          <div className={`rounded-lg p-4 border ${
            riskIncreasing 
              ? 'bg-red-900/20 border-red-700/30' 
              : 'bg-green-900/20 border-green-700/30'
          }`}>
            <div className={`text-xs uppercase tracking-wide mb-1 ${
              riskIncreasing ? 'text-red-600' : 'text-emerald-600'
            }`}>
              Projected (30d)
            </div>
            <div className={`text-2xl font-bold ${
              riskIncreasing ? 'text-red-600' : 'text-emerald-600'
            }`}>
              {formatCurrency(projectedRisk)}
            </div>
            <div className="text-xs text-gray-500 mt-1">🔮 Based on trends</div>
          </div>

          <div className={`rounded-lg p-4 border ${
            riskIncreasing 
              ? 'bg-red-900/20 border-red-700/30' 
              : 'bg-green-900/20 border-green-700/30'
          }`}>
            <div className={`text-xs uppercase tracking-wide mb-1 ${
              riskIncreasing ? 'text-red-600' : 'text-emerald-600'
            }`}>
              {riskIncreasing ? 'Increase' : 'Reduction'}
            </div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${
              riskIncreasing ? 'text-red-600' : 'text-emerald-600'
            }`}>
              {riskIncreasing ? '↑' : '↓'}
              {formatCurrency(Math.abs(riskChange))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {riskIncreasing ? '⚠️ Action needed' : '✅ On track'}
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        {riskIncreasing && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">Risk Exposure Increasing</p>
              <p className="text-xs text-red-600/80 mt-1">
                Forecast shows potential exposure growing by {formatCurrency(Math.abs(riskChange))} over the next 30 days. 
                Accelerate violation fixes to reduce liability.
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="relative h-64 mt-6">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-gray-500">
            <span>{formatCurrency(maxRisk)}</span>
            <span>{formatCurrency(Math.round(maxRisk * 0.75))}</span>
            <span>{formatCurrency(Math.round(maxRisk * 0.5))}</span>
            <span>{formatCurrency(Math.round(maxRisk * 0.25))}</span>
            <span>$0</span>
          </div>

          {/* Chart area */}
          <div className="ml-16 mr-4 h-full relative">
            {/* Forecast divider */}
            <div
              className="absolute top-0 bottom-8 border-l-2 border-dashed border-cyan-500/30 z-10"
              style={{ left: `${(forecastStartIndex / chartData.length) * 100}%` }}
            >
              <span className="absolute -top-6 left-2 text-xs text-cyan-400 font-medium whitespace-nowrap">
                🔮 Projection
              </span>
            </div>

            {/* Area chart */}
            <svg className="w-full h-full" preserveAspectRatio="none">
              {/* Historical area */}
              <defs>
                <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={riskIncreasing ? '#ef4444' : '#10b981'} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={riskIncreasing ? '#ef4444' : '#10b981'} stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Historical area path */}
              <path
                d={chartData.slice(0, forecastStartIndex + 1).map((point, idx) => {
                  const x = (idx / chartData.length) * 100
                  const y = 100 - ((point.risk / maxRisk) * 90) // 90% of height, leaving space for x-axis
                  return `${idx === 0 ? 'M' : 'L'} ${x}% ${y}%`
                }).join(' ') + ` L ${(forecastStartIndex / chartData.length) * 100}% 100% L 0% 100% Z`}
                fill="url(#historicalGradient)"
                className="transition-all duration-500"
              />

              {/* Forecast area path */}
              <path
                d={chartData.slice(forecastStartIndex).map((point, idx) => {
                  const absoluteIdx = forecastStartIndex + idx
                  const x = (absoluteIdx / chartData.length) * 100
                  const y = 100 - ((point.risk / maxRisk) * 90)
                  return `${idx === 0 ? 'M' : 'L'} ${x}% ${y}%`
                }).join(' ') + ` L 100% 100% L ${(forecastStartIndex / chartData.length) * 100}% 100% Z`}
                fill="url(#forecastGradient)"
                className="transition-all duration-500"
              />

              {/* Historical line */}
              <path
                d={chartData.slice(0, forecastStartIndex + 1).map((point, idx) => {
                  const x = (idx / chartData.length) * 100
                  const y = 100 - ((point.risk / maxRisk) * 90)
                  return `${idx === 0 ? 'M' : 'L'} ${x}% ${y}%`
                }).join(' ')}
                fill="none"
                stroke={riskIncreasing ? '#ef4444' : '#10b981'}
                strokeWidth="2"
                className="transition-all duration-500"
              />

              {/* Forecast line (dashed) */}
              <path
                d={chartData.slice(forecastStartIndex).map((point, idx) => {
                  const absoluteIdx = forecastStartIndex + idx
                  const x = (absoluteIdx / chartData.length) * 100
                  const y = 100 - ((point.risk / maxRisk) * 90)
                  return `${idx === 0 ? 'M' : 'L'} ${x}% ${y}%`
                }).join(' ')}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeDasharray="4 4"
                className="transition-all duration-500"
              />
            </svg>
          </div>

          {/* X-axis */}
          <div className="ml-16 mr-4 mt-2 flex justify-between text-xs text-gray-500">
            <span>{chartData[0] ? new Date(chartData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
            <span className="text-cyan-400">Today</span>
            <span className="text-cyan-400">{chartData[chartData.length - 1] ? new Date(chartData[chartData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${riskIncreasing ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-xs text-gray-600">Historical Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500 opacity-60" />
              <span className="text-xs text-gray-600">Projected Risk</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <RiskDisclaimer audience="developer" variant="inline" showSources />
        </div>
      </div>
    </div>
  )
}

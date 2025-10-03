'use client'

import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, Calendar, Target, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/reports-utils'
import type { TrendDataPoint } from '@/types/reports'

interface ComplianceForecastProps {
  trendData: TrendDataPoint[] | null
}

interface ForecastPoint {
  date: string
  projected_score: number
  projected_violations: number
  is_forecast: boolean
}

export function ComplianceForecast({ trendData }: ComplianceForecastProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0)

  const forecast = useMemo(() => {
    if (!trendData || trendData.length < 3) return null

    // Calculate trend velocity (violations fixed per day)
    const recentData = trendData.slice(-7) // Last 7 days
    const velocities: number[] = []
    
    for (let i = 1; i < recentData.length; i++) {
      const prev = recentData[i - 1]
      const curr = recentData[i]
      const fixedViolations = prev.total_violations - curr.total_violations
      velocities.push(fixedViolations)
    }

    const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length
    const currentViolations = recentData[recentData.length - 1].total_violations
    const currentScore = recentData[recentData.length - 1].avg_score ?? 85

    // If velocity is negative or zero, we can't forecast improvement
    if (avgVelocity <= 0) {
      return {
        canForecast: false,
        message: 'Fix more violations to enable compliance forecasting'
      }
    }

    // Calculate weeks to reach 95% compliance (assuming linear improvement)
    const targetScore = 95
    const scoreDelta = targetScore - currentScore
    const scoreImprovementPerViolation = scoreDelta / currentViolations
    const daysToTarget = Math.ceil(currentViolations / avgVelocity)
    const weeksToTarget = Math.ceil(daysToTarget / 7)

    // Generate forecast points
    const forecastPoints: ForecastPoint[] = []
    const today = new Date()
    
    for (let week = 0; week <= Math.min(weeksToTarget, 12); week++) {
      const date = new Date(today)
      date.setDate(date.getDate() + (week * 7))
      
      const violationsFixed = Math.min(avgVelocity * 7 * week, currentViolations)
      const projectedViolations = Math.max(0, currentViolations - violationsFixed)
      const projectedScore = Math.min(100, currentScore + (violationsFixed * scoreImprovementPerViolation))
      
      forecastPoints.push({
        date: date.toISOString().split('T')[0],
        projected_score: projectedScore,
        projected_violations: Math.round(projectedViolations),
        is_forecast: week > 0
      })
    }

    // Calculate risk projection
    const violationWeights = {
      critical: 10000,
      serious: 5000,
      moderate: 1000,
      minor: 100
    }
    
    const currentRisk = currentViolations * 2500 // Average weight
    const projectedRisk = forecastPoints[forecastPoints.length - 1].projected_violations * 2500

    return {
      canForecast: true,
      weeksToTarget,
      daysToTarget,
      avgVelocity: Math.round(avgVelocity),
      currentViolations,
      currentScore,
      targetScore,
      forecastPoints,
      currentRisk,
      projectedRisk,
      riskReduction: currentRisk - projectedRisk
    }
  }, [trendData])

  useEffect(() => {
    if (!forecast || !forecast.canForecast || !forecast.targetScore) return

    const targetProgress = (forecast.currentScore / forecast.targetScore) * 100
    let current = 0
    const increment = targetProgress / 50
    
    const timer = setInterval(() => {
      current += increment
      if (current >= targetProgress) {
        setAnimatedProgress(targetProgress)
        clearInterval(timer)
      } else {
        setAnimatedProgress(current)
      }
    }, 20)

    return () => clearInterval(timer)
  }, [forecast])

  if (!forecast) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center border border-cyan-200">
            <TrendingUp className="w-5 h-5 text-cyan-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Compliance Forecast</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500 text-sm">Not enough data to generate forecast</p>
        </div>
      </div>
    )
  }

  if (!forecast.canForecast) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Compliance Forecast</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-600 text-sm">{forecast.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm relative overflow-hidden">
      {/* Subtle animated background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-transparent rounded-full blur-3xl animate-pulse" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center border border-cyan-200">
            <TrendingUp className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Compliance Forecast</h3>
            <p className="text-sm text-gray-600">Predictive analysis based on your fix rate</p>
          </div>
        </div>

        {/* Main forecast metric */}
        <div className="bg-gray-50/50 rounded-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-cyan-600" />
                <span className="text-sm text-gray-600">Time to WCAG AA Compliance</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-cyan-600">
                  {forecast.weeksToTarget}
                </span>
                <span className="text-xl text-gray-600">weeks</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                At {forecast.avgVelocity} violations/day
              </p>
            </div>
            
            {/* Progress ring */}
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-gray-700"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - animatedProgress / 100)}`}
                  className="text-cyan-600 transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">
                  {(forecast.currentScore ?? 0).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Mini timeline */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-4 h-4" />
            {forecast.forecastPoints && forecast.forecastPoints.length > 0 && (
              <span>
                Target: {new Date(forecast.forecastPoints[forecast.forecastPoints.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        {/* Risk projection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-red-900/20 rounded-lg p-4 border border-red-700/30">
            <div className="text-xs text-red-600 uppercase tracking-wide mb-2">Current Risk</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(forecast.currentRisk ?? 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {forecast.currentViolations ?? 0} violations
            </div>
          </div>

          <div className="bg-green-900/20 rounded-lg p-4 border border-green-700/30">
            <div className="text-xs text-emerald-600 uppercase tracking-wide mb-2">Projected Risk</div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(forecast.projectedRisk ?? 0)}
            </div>
            {forecast.forecastPoints && forecast.forecastPoints.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {forecast.forecastPoints[forecast.forecastPoints.length - 1].projected_violations} violations
              </div>
            )}
          </div>
        </div>

        {/* Risk reduction badge */}
        <div className="mt-4 p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Projected Risk Reduction</span>
            <span className="text-xl font-bold text-emerald-600">
              {formatCurrency(forecast.riskReduction ?? 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

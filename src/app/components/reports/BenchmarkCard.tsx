'use client'

import { TrendingUp, Award, Users, Target } from 'lucide-react'
import type { KPIData } from '@/types/reports'

interface BenchmarkCardProps {
  kpiData: KPIData | null
}

export function BenchmarkCard({ kpiData }: BenchmarkCardProps) {
  if (!kpiData) {
    return (
      <div className="bg-gradient-to-br from-gray-800 to-gray-850 rounded-lg p-6 border border-gray-200 animate-pulse">
        <div className="h-48 bg-gray-700 rounded" />
      </div>
    )
  }

  const yourScore = kpiData.avg_score_30d
  
  // Simulated benchmarking data (in production, this would come from aggregate analytics)
  const industryAverage = 87.3
  const topPerformer = 96.8
  const percentile = Math.min(95, Math.round(((yourScore - industryAverage) / industryAverage) * 100 + 70))
  const performanceDelta = yourScore - industryAverage

  const getPerformanceLevel = () => {
    if (percentile >= 90) return { label: 'Exceptional', color: 'text-emerald-600', bgColor: 'from-green-500/20 to-emerald-500/20', icon: Award }
    if (percentile >= 75) return { label: 'Above Average', color: 'text-blue-600', bgColor: 'from-blue-500/20 to-cyan-500/20', icon: TrendingUp }
    if (percentile >= 50) return { label: 'Average', color: 'text-amber-400', bgColor: 'from-amber-500/20 to-yellow-500/20', icon: Target }
    return { label: 'Below Average', color: 'text-red-600', bgColor: 'from-red-500/20 to-orange-500/20', icon: Target }
  }

  const performance = getPerformanceLevel()
  const Icon = performance.icon

  return (
    <div className={`bg-gradient-to-br ${performance.bgColor} rounded-lg p-6 border border-gray-200 relative overflow-hidden backdrop-blur-sm`}>
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-full blur-3xl" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${performance.bgColor} flex items-center justify-center border border-current/20`}>
            <Icon className={`w-6 h-6 ${performance.color}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Industry Benchmark</h3>
            <p className="text-sm text-gray-600">How you compare</p>
          </div>
        </div>

        {/* Main comparison chart */}
        <div className="space-y-4 mb-6">
          {/* Your score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Your Score</span>
              <span className={`text-lg font-bold ${performance.color}`}>
                {yourScore.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-700/50 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${performance.bgColor} rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${Math.min(100, yourScore)}%` }}
              />
            </div>
          </div>

          {/* Industry average */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Industry Average</span>
              <span className="text-lg font-bold text-gray-600">
                {industryAverage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gray-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, industryAverage)}%` }}
              />
            </div>
          </div>

          {/* Top performer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Top Performer</span>
              <span className="text-lg font-bold text-gray-500">
                {topPerformer.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-700/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gray-700 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, topPerformer)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Performance badge */}
        <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Your Ranking</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${performance.color}`}>
                  Top {100 - percentile}%
                </span>
                <span className="text-sm text-gray-600">of monitored sites</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                performanceDelta > 0 ? 'bg-green-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'
              }`}>
                <TrendingUp className={`w-4 h-4 ${performanceDelta < 0 ? 'rotate-180' : ''}`} />
                <span className="text-sm font-bold">
                  {performanceDelta > 0 ? '+' : ''}{performanceDelta.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">vs industry</p>
            </div>
          </div>
        </div>

        {/* Performance label */}
        <div className="mt-4 text-center">
          <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${performance.color} bg-white/5 border border-current/20 font-medium text-sm`}>
            <Icon className="w-4 h-4" />
            {performance.label}
          </span>
        </div>
      </div>
    </div>
  )
}

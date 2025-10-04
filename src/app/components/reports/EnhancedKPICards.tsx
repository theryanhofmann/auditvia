'use client'

import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Globe, Github } from 'lucide-react'
import { formatNumber, formatPercent, calculatePercentChange } from '@/lib/reports-utils'
import type { KPIData } from '@/types/reports'
import { useEffect, useState } from 'react'

interface EnhancedKPICardsProps {
  data: KPIData | null
  loading: boolean
  previousData?: KPIData | null
}

interface KPICardProps {
  title: string
  value: string | number
  previousValue?: number
  icon: React.ReactNode
  description: string
  loading: boolean
  trend?: 'up' | 'down' | 'neutral'
  sparklineData?: number[]
  onClick?: () => void
}

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length === 0) return null
  
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')
  
  return (
    <svg 
      className="w-20 h-8 opacity-50" 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function KPICard({ title, value, previousValue, icon, description, loading, trend: _trend, sparklineData, onClick }: KPICardProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="h-4 bg-gray-700 rounded w-32"></div>
          <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
        </div>
        <div className="h-10 bg-gray-700 rounded w-28 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-full"></div>
      </div>
    )
  }

  const changePercent = previousValue !== undefined ? calculatePercentChange(Number(value), previousValue) : null

  return (
    <div 
      className={`bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      } ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-gray-300 shadow-lg">
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-4xl font-bold text-white tracking-tight">{value}</span>
        {changePercent !== null && changePercent !== 0 && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium ${
            changePercent > 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
          }`}>
            {changePercent > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(changePercent).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 flex-1">{description}</p>
        {sparklineData && sparklineData.length > 0 && (
          <div className="text-gray-600">
            <MiniSparkline data={sparklineData} />
          </div>
        )}
      </div>
    </div>
  )
}

export function EnhancedKPICards({ data, loading, previousData }: EnhancedKPICardsProps) {
  const score = data?.avg_score_30d || 0
  const violations = data?.total_violations_30d || 0
  const monitored = data?.monitored_sites || 0
  const githubIssues = data?.github_issues_created_30d || 0

  const previousScore = previousData?.avg_score_30d
  const previousViolations = previousData?.total_violations_30d
  const previousMonitored = previousData?.monitored_sites
  const previousGithubIssues = previousData?.github_issues_created_30d

  // Mock sparkline data (in real implementation, fetch from trend endpoint)
  const scoreSparkline = [82, 79, 85, 87, 84, 88, score]
  const violationsSparkline = [violations * 1.2, violations * 1.1, violations * 0.9, violations]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <KPICard
        title="Overall Score"
        value={formatPercent(score, 1)}
        previousValue={previousScore}
        icon={score >= 90 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        description="Avg accessibility score (last 30 days)"
        loading={loading}
        sparklineData={scoreSparkline}
      />
      
      <KPICard
        title="Open Violations"
        value={formatNumber(violations)}
        previousValue={previousViolations}
        icon={<AlertCircle className="w-5 h-5" />}
        description="Total issues found (last 30 days)"
        loading={loading}
        sparklineData={violationsSparkline}
        onClick={() => window.location.href = '/dashboard/reports/violations'}
      />
      
      <KPICard
        title="Sites Monitored"
        value={formatNumber(monitored)}
        previousValue={previousMonitored}
        icon={<Globe className="w-5 h-5" />}
        description="Active monitoring enabled"
        loading={loading}
      />
      
      <KPICard
        title="GitHub Issues"
        value={formatNumber(githubIssues)}
        previousValue={previousGithubIssues}
        icon={<Github className="w-5 h-5" />}
        description="Issues created (last 30 days)"
        loading={loading}
        onClick={() => window.location.href = '/dashboard/reports/tickets'}
      />
    </div>
  )
}

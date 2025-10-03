'use client'

import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Globe, Github, ArrowRight } from 'lucide-react'
import { formatNumber, formatPercent, formatCurrency, calculatePercentChange } from '@/lib/reports-utils'
import type { KPIData } from '@/types/reports'
import { useEffect, useState } from 'react'
import { CircularProgress } from './CircularProgress'
import { AnimatedNumber } from './AnimatedNumber'

interface InteractiveKPICardsProps {
  data: KPIData | null
  loading: boolean
  previousData?: KPIData | null
}

interface KPICardProps {
  title: string
  value: number
  previousValue?: number
  icon: React.ReactNode
  description: string
  loading: boolean
  trend?: 'up' | 'down' | 'neutral'
  type?: 'percentage' | 'number' | 'currency'
  showGauge?: boolean
  onClick?: () => void
  delay?: number
}

function MiniSparkline({ data, color = '#3B82F6' }: { data: number[]; color?: string }) {
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
      className="w-24 h-10" 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* Area fill */}
      <path
        d={`M 0 100 L ${points} L 100 100 Z`}
        fill={color}
        opacity="0.1"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function KPICard({ 
  title, 
  value, 
  previousValue, 
  icon, 
  description, 
  loading, 
  trend, 
  type = 'number',
  showGauge = false,
  onClick,
  delay = 0
}: KPICardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="w-12 h-12 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="h-12 bg-gray-200 rounded w-32 mb-3"></div>
        <div className="h-3 bg-gray-100 rounded w-full"></div>
      </div>
    )
  }

  const changePercent = previousValue !== undefined ? calculatePercentChange(value, previousValue) : null
  const isPositiveTrend = changePercent ? changePercent > 0 : false

  // Mock sparkline data
  const sparklineData = previousValue 
    ? [previousValue * 0.95, previousValue * 1.02, previousValue * 0.98, previousValue * 1.05, value]
    : [value * 0.9, value * 0.95, value, value * 1.05, value]

  const getColor = () => {
    if (type === 'percentage' && value >= 90) return '#10B981'
    if (type === 'percentage' && value < 70) return '#EF4444'
    return '#3B82F6'
  }

  return (
    <div 
      className={`group relative bg-white rounded-lg p-6 border transition-all duration-300 ${
        isHovered 
          ? 'border-blue-400 shadow-md scale-[1.01]' 
          : 'border-gray-200 shadow-sm hover:shadow-md'
      } ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Subtle gradient overlay on hover */}
      {isHovered && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg opacity-50 transition-opacity duration-300" />
      )}

      <div className="relative">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-1">{title}</h3>
            {changePercent !== null && changePercent !== 0 && (
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                isPositiveTrend 
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {isPositiveTrend ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{Math.abs(changePercent).toFixed(1)}%</span>
              </div>
            )}
          </div>
          
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200">
            {icon}
          </div>
        </div>
        
        {showGauge ? (
          <div className="flex items-center justify-between mb-4">
            <CircularProgress 
              value={value} 
              size={100}
              strokeWidth={8}
              color={getColor()}
              glowColor={`${getColor()}80`}
            />
            <div className="flex-1 ml-4">
              <MiniSparkline data={sparklineData} color={getColor()} />
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-bold text-gray-900 tracking-tight">
                {type === 'percentage' && <AnimatedNumber value={value} decimals={1} suffix="%" className="text-4xl font-bold text-gray-900" />}
                {type === 'currency' && <AnimatedNumber value={value} prefix="$" className="text-4xl font-bold text-gray-900" />}
                {type === 'number' && <AnimatedNumber value={value} className="text-4xl font-bold text-gray-900" />}
              </span>
            </div>
            <MiniSparkline data={sparklineData} color={getColor()} />
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 flex-1">{description}</p>
          {onClick && (
            <ArrowRight className={`w-4 h-4 text-blue-600 transition-transform duration-300 ${
              isHovered ? 'translate-x-1' : ''
            }`} />
          )}
        </div>
      </div>
    </div>
  )
}

export function InteractiveKPICards({ data, loading, previousData }: InteractiveKPICardsProps) {
  const score = data?.avg_score_30d || 0
  const violations = data?.total_violations_30d || 0
  const monitored = data?.monitored_sites || 0
  const githubIssues = data?.github_issues_created_30d || 0

  const previousScore = previousData?.avg_score_30d
  const previousViolations = previousData?.total_violations_30d
  const previousMonitored = previousData?.monitored_sites
  const previousGithubIssues = previousData?.github_issues_created_30d

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <KPICard
        title="Overall Score"
        value={score}
        previousValue={previousScore}
        icon={score >= 90 ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
        description="Avg accessibility score (30d)"
        loading={loading}
        type="percentage"
        showGauge={true}
        delay={0}
      />
      
      <KPICard
        title="Open Violations"
        value={violations}
        previousValue={previousViolations}
        icon={<AlertCircle className="w-6 h-6" />}
        description="Total issues found (30d)"
        loading={loading}
        type="number"
        onClick={() => window.location.href = '/dashboard/reports/violations'}
        delay={100}
      />
      
      <KPICard
        title="Sites Monitored"
        value={monitored}
        previousValue={previousMonitored}
        icon={<Globe className="w-6 h-6" />}
        description="Active monitoring enabled"
        loading={loading}
        type="number"
        delay={200}
      />
      
      <KPICard
        title="GitHub Issues"
        value={githubIssues}
        previousValue={previousGithubIssues}
        icon={<Github className="w-6 h-6" />}
        description="Issues created (30d)"
        loading={loading}
        type="number"
        onClick={() => window.location.href = '/dashboard/reports/tickets'}
        delay={300}
      />
    </div>
  )
}

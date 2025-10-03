'use client'

import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Globe, Github } from 'lucide-react'
import { formatNumber, formatPercent } from '@/lib/reports-utils'
import type { KPIData } from '@/types/reports'

interface KPICardsProps {
  data: KPIData | null
  loading: boolean
}

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  description: string
  loading: boolean
}

function KPICard({ title, value, change, icon, description, loading }: KPICardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          <div className="w-10 h-10 bg-gray-100 rounded-lg"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-3 bg-gray-100 rounded w-40"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">{title}</h3>
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {change !== undefined && change !== 0 && (
          <span className={`text-sm font-medium flex items-center gap-1 ${
            change > 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {change > 0 ? (
              <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />
            )}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  )
}

export function KPICards({ data, loading }: KPICardsProps) {
  const score = data?.avg_score_30d || 0
  const violations = data?.total_violations_30d || 0
  const monitored = data?.monitored_sites || 0
  const githubIssues = data?.github_issues_created_30d || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <KPICard
        title="Overall Score"
        value={formatPercent(score, 1)}
        icon={score >= 90 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        description="Average accessibility score across all scans (last 30 days)"
        loading={loading}
      />
      
      <KPICard
        title="Open Violations"
        value={formatNumber(violations)}
        icon={<AlertCircle className="w-5 h-5" />}
        description="Total accessibility issues found (last 30 days)"
        loading={loading}
      />
      
      <KPICard
        title="Sites Monitored"
        value={formatNumber(monitored)}
        icon={<Globe className="w-5 h-5" />}
        description="Sites with active monitoring enabled"
        loading={loading}
      />
      
      <KPICard
        title="GitHub Issues Created"
        value={formatNumber(githubIssues)}
        icon={<Github className="w-5 h-5" />}
        description="Issues opened for violations (last 30 days)"
        loading={loading}
      />
    </div>
  )
}

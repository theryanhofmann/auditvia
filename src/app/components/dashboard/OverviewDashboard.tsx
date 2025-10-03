'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Play,
  FileText,
  Github,
  BarChart3,
  Zap
} from 'lucide-react'
import { formatNumber } from '@/lib/reports-utils'
import { calculateVerdict, type VerdictResult } from '@/lib/verdict-system'

interface Site {
  id: string
  name: string | null
  url?: string
  created_at?: string
}

interface OverviewDashboardProps {
  teamId: string
  sites: Site[]
}

interface QuickStats {
  totalSites: number
  totalScans: number
  activeViolations: number
  criticalCount: number
  seriousCount: number
  moderateCount: number
  minorCount: number
  verdict: VerdictResult
  recentActivity: string
}

export function OverviewDashboard({ teamId, sites }: OverviewDashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [loading, setLoading] = useState(true)

  // Helper to get date range for API calls
  const getStartDate = () => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split('T')[0]
  }

  const getEndDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/reports/kpis?teamId=${teamId}&startDate=${getStartDate()}&endDate=${getEndDate()}`)
        if (response.ok) {
          const data = await response.json()
          
          // Fetch severity breakdown for verdict calculation from the correct endpoint
          const violationsResponse = await fetch(`/api/analytics/violations-trend?range=30`)
          let criticalCount = 0
          let seriousCount = 0
          let moderateCount = 0
          let minorCount = 0
          
          if (violationsResponse.ok) {
            const violationsData = await violationsResponse.json()
            // Sum up the latest severity counts from the data array
            const latest = violationsData.data?.[violationsData.data.length - 1]
            if (latest) {
              criticalCount = latest.critical || 0
              seriousCount = latest.serious || 0
              moderateCount = latest.moderate || 0
              minorCount = latest.minor || 0
            }
          }
          
          const verdict = calculateVerdict(criticalCount, seriousCount, moderateCount, minorCount)
          
          setStats({
            totalSites: data.total_sites || sites.length,
            totalScans: data.total_scans_30d || 0,
            activeViolations: data.total_violations_30d || 0,
            criticalCount,
            seriousCount,
            moderateCount,
            minorCount,
            verdict,
            recentActivity: 'Just now'
          })
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [teamId, sites])

  const quickActions = [
    {
      icon: Play,
      label: 'Run New Scan',
      description: 'Scan a site for accessibility issues',
      color: 'from-blue-500 to-cyan-500',
      action: () => router.push('/dashboard/sites')
    },
    {
      icon: BarChart3,
      label: 'View Detailed Analytics',
      description: 'Deep-dive into trends and forecasts',
      color: 'from-purple-500 to-pink-500',
      action: () => router.push('/dashboard/reports')
    },
    {
      icon: Github,
      label: 'Create GitHub Issues',
      description: 'Export violations to GitHub',
      color: 'from-gray-700 to-gray-900',
      action: () => router.push('/dashboard/violations')
    },
    {
      icon: FileText,
      label: 'Export Report',
      description: 'Download compliance documentation',
      color: 'from-green-500 to-emerald-500',
      action: () => router.push('/dashboard/reports')
    }
  ]

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 70) return 'text-amber-400'
    return 'text-red-400'
  }

  const getScoreStatus = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 70) return 'Good'
    return 'Needs Attention'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse space-y-8 w-full max-w-7xl px-6">
          <div className="h-12 bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded-xl" />
            ))}
          </div>
          <div className="h-96 bg-gray-700 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-white via-blue-50/30 to-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                Welcome back
              </h1>
              <p className="text-sm text-gray-600">
                Here's your accessibility compliance overview
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Last updated: {stats?.recentActivity}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Compliance Verdict */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
               onClick={() => router.push('/dashboard/reports')}>
            <div className="flex items-center gap-2 mb-3">
              {stats?.verdict?.status === 'compliant' ? (
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              ) : stats?.verdict?.status === 'at-risk' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Compliance Status</h3>
            </div>
            <div className={`text-lg font-semibold mb-1 ${
              stats?.verdict?.status === 'compliant' ? 'text-green-400' :
              stats?.verdict?.status === 'at-risk' ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {stats?.verdict?.title || 'Loading...'}
            </div>
            <p className="text-xs text-gray-500">{stats?.verdict?.riskLevel || 'WCAG 2.2 Level AA'}</p>
            {/* Severity breakdown pills */}
            {stats && (stats.criticalCount > 0 || stats.seriousCount > 0) && (
              <div className="flex gap-2 mt-2">
                {stats.criticalCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                    {stats.criticalCount} Critical
                  </span>
                )}
                {stats.seriousCount > 0 && (
                  <span className="px-2 py-0.5 rounded text-xs bg-orange-500/20 text-orange-400">
                    {stats.seriousCount} Serious
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Active Violations */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
               onClick={() => router.push('/dashboard/violations')}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Open Issues</h3>
            </div>
            <div className="text-2xl font-semibold text-white mb-1">
              {formatNumber(stats?.activeViolations || 0)}
            </div>
            <p className="text-xs text-gray-500">Requires attention</p>
          </div>

          {/* Sites Monitored */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
               onClick={() => router.push('/dashboard/sites')}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Active Sites</h3>
            </div>
            <div className="text-2xl font-semibold text-white mb-1">
              {stats?.totalSites || 0}
            </div>
            <p className="text-xs text-gray-500">Being monitored</p>
          </div>

          {/* Scans This Month */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
               onClick={() => router.push('/dashboard/reports')}>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide">Scans (30d)</h3>
            </div>
            <div className="text-2xl font-semibold text-white mb-1">
              {stats?.totalScans || 0}
            </div>
            <p className="text-xs text-gray-500">Completed audits</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, idx) => {
              const Icon = action.icon
              return (
                <button
                  key={idx}
                  onClick={action.action}
                  className="group bg-gray-800 hover:bg-gray-750 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
                    <h3 className="text-sm font-medium text-white flex items-center justify-between flex-1">
                      {action.label}
                      <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </h3>
                  </div>
                  <p className="text-xs text-gray-400">{action.description}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Activity / Sites List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Sites</h2>
            <button
              onClick={() => router.push('/dashboard/sites')}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {sites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sites.slice(0, 6).map(site => (
                <div
                  key={site.id}
                  onClick={() => router.push(`/dashboard/sites/${site.id}`)}
                  className="bg-gray-800 hover:bg-gray-750 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                      {((site.name || 'U') as string).charAt(0).toUpperCase()}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-white font-semibold mb-1 truncate">{site.name || 'Unnamed Site'}</h3>
                  <p className="text-sm text-gray-400">Click to view details</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No sites yet</h3>
              <p className="text-gray-400 mb-6">Start monitoring your first site for accessibility compliance</p>
              <button
                onClick={() => router.push('/dashboard/sites')}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-all"
              >
                Add Your First Site
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Play,
  FileText,
  MessageCircle,
  Clock,
  Globe,
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

interface AINativeOverviewProps {
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
  complianceScore: number
}

export function AINativeOverview({ teamId, sites }: AINativeOverviewProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [stats, setStats] = useState<QuickStats | null>(null)
  const [loading, setLoading] = useState(true)

  const userName = session?.user?.name?.split(' ')[0] || 'there'

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
          
          // Fetch severity breakdown
          const violationsResponse = await fetch(`/api/analytics/violations-trend?range=30`)
          let criticalCount = 0
          let seriousCount = 0
          let moderateCount = 0
          let minorCount = 0
          
          if (violationsResponse.ok) {
            const violationsData = await violationsResponse.json()
            const latest = violationsData.data?.[violationsData.data.length - 1]
            if (latest) {
              criticalCount = latest.critical || 0
              seriousCount = latest.serious || 0
              moderateCount = latest.moderate || 0
              minorCount = latest.minor || 0
            }
          }
          
          const verdict = calculateVerdict(criticalCount, seriousCount, moderateCount, minorCount)
          const totalViolations = criticalCount + seriousCount + moderateCount + minorCount
          const complianceScore = totalViolations === 0 ? 100 : Math.max(0, Math.round(100 - (criticalCount * 10 + seriousCount * 5 + moderateCount * 2 + minorCount * 0.5)))
          
          setStats({
            totalSites: data.total_sites || sites.length,
            totalScans: data.total_scans_30d || 0,
            activeViolations: data.total_violations_30d || 0,
            criticalCount,
            seriousCount,
            moderateCount,
            minorCount,
            verdict,
            complianceScore
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg" />
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                {userName}, Welcome to Auditvia
              </h1>
              <p className="text-sm text-gray-600">
                Your accessibility compliance dashboard
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/sites')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Run New Scan
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Compliance Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              {stats?.verdict?.status === 'compliant' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : stats?.verdict?.status === 'at-risk' ? (
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Compliance Status</h3>
            </div>
            <div className={`text-xl font-semibold mb-1 ${
              stats?.verdict?.status === 'compliant' ? 'text-green-600' :
              stats?.verdict?.status === 'at-risk' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {stats?.verdict?.title || 'Loading...'}
            </div>
            <p className="text-xs text-gray-500">{stats?.complianceScore || 0}% compliant</p>
          </div>

          {/* Active Violations */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-gray-400" />
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Open Issues</h3>
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              {formatNumber(stats?.activeViolations || 0)}
            </div>
            <p className="text-xs text-gray-500">
              {stats?.criticalCount || 0} critical, {stats?.seriousCount || 0} serious
            </p>
          </div>

          {/* Active Sites */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Sites</h3>
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              {stats?.totalSites || 0}
            </div>
            <p className="text-xs text-gray-500">Being monitored</p>
          </div>

          {/* Scans This Month */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Scans (30d)</h3>
            </div>
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              {stats?.totalScans || 0}
            </div>
            <p className="text-xs text-gray-500">Completed audits</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Run Scan */}
            <button
              onClick={() => router.push('/dashboard/sites')}
              className="group bg-white rounded-lg border border-gray-200 hover:border-blue-600 p-5 text-left transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-gray-600" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Run Accessibility Scan</h3>
              <p className="text-xs text-gray-600">Audit your site for WCAG compliance</p>
            </button>

            {/* AI Assistant */}
            <button
              onClick={() => {
                const aiButton = document.querySelector('[aria-label="Open AI Engineer Assistant"]') as HTMLButtonElement
                if (aiButton) aiButton.click()
              }}
              className="group bg-white rounded-lg border border-gray-200 hover:border-blue-600 p-5 text-left transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Talk to AI Engineer</h3>
              <p className="text-xs text-gray-600">Get instant compliance guidance</p>
            </button>

            {/* View Reports */}
            <button
              onClick={() => router.push('/dashboard/reports')}
              className="group bg-white rounded-lg border border-gray-200 hover:border-blue-600 p-5 text-left transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-gray-600" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">View Analytics</h3>
              <p className="text-xs text-gray-600">Track compliance trends</p>
            </button>

            {/* Fix Violations */}
            <button
              onClick={() => router.push('/dashboard/violations')}
              className="group bg-white rounded-lg border border-gray-200 hover:border-blue-600 p-5 text-left transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-gray-600" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Fix Violations</h3>
              <p className="text-xs text-gray-600">Review and resolve issues</p>
            </button>
          </div>
        </div>

        {/* Recent Sites */}
        {sites.length > 0 ? (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Your Sites</h2>
              <button
                onClick={() => router.push('/dashboard/sites')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.slice(0, 6).map(site => (
                <button
                  key={site.id}
                  onClick={() => router.push(`/dashboard/sites/${site.id}`)}
                  className="group bg-white rounded-lg border border-gray-200 hover:border-blue-600 p-5 text-left transition-all flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-sm flex-shrink-0">
                    {((site.name || 'U') as string).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate mb-0.5">
                      {site.name || 'Unnamed Site'}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">{site.url || 'No URL'}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Globe className="w-8 h-8 mx-auto text-gray-400 mb-4" />
            <h3 className="text-base font-medium text-gray-900 mb-2">
              No Sites Yet
            </h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              Start monitoring your first site for accessibility compliance
            </p>
            <button
              onClick={() => router.push('/dashboard/sites')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Site
            </button>
          </div>
        )}

        {/* Resources */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Resources & Help</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Documentation */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <FileText className="w-6 h-6 text-gray-400 mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Documentation</h3>
              <p className="text-xs text-gray-600 mb-3">
                Learn about WCAG 2.2 standards and implementation guides
              </p>
              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View docs
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* AI Assistant */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <MessageCircle className="w-6 h-6 text-gray-400 mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">AI Engineer</h3>
              <p className="text-xs text-gray-600 mb-3">
                Get instant help with compliance questions and fixes
              </p>
              <button
                onClick={() => {
                  const aiButton = document.querySelector('[aria-label="Open AI Engineer Assistant"]') as HTMLButtonElement
                  if (aiButton) aiButton.click()
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                Ask AI
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Support */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <Shield className="w-6 h-6 text-gray-400 mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Need Help?</h3>
              <p className="text-xs text-gray-600 mb-3">
                Contact our team for personalized support and guidance
              </p>
              <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Contact us
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

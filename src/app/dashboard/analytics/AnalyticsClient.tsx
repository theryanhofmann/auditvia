'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Download,
  Save,
  Mail,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  MoreVertical,
  ChevronRight,
  X,
  Calendar,
  Globe,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Tag,
  Search,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  FileText,
  Github,
  Layers,
  Shield
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'

// Types
interface KPI {
  id: string
  label: string
  value: number | string
  subtitle?: string
  delta: number
  trend: 'up' | 'down' | 'neutral'
  sparklineData: number[]
  icon: any
  color: string
}

interface ChartModule {
  id: string
  title: string
  description: string
  type: 'line' | 'area' | 'bar' | 'scatter' | 'pie' | 'table'
  pinned: boolean
  order: number
}

interface TimeSeriesData {
  date: string
  created: number
  closed: number
  critical: number
  serious: number
  moderate: number
  minor: number
}

interface RiskData {
  date: string
  riskCreated: number
  riskReduced: number
  cumulative: number
}

interface TopRule {
  ruleId: string
  ruleName: string
  category: string
  severity: string
  count: number
  riskScore: number
  sites: number
  pages: number
}

// Severity colors (muted palette)
const severityColors = {
  critical: '#ef4444',
  serious: '#f97316',
  moderate: '#f59e0b',
  minor: '#3b82f6'
}

// Category colors
const categoryColors = {
  Forms: '#8b5cf6',
  Color: '#ec4899',
  ARIA: '#06b6d4',
  Landmark: '#10b981',
  Keyboard: '#f59e0b',
  Media: '#6366f1'
}

// Format number with commas
function formatNumber(num: number): string {
  return num.toLocaleString('en-US')
}

// Format currency
function formatCurrency(num: number): string {
  return `$${num.toLocaleString('en-US')}`
}

// Format percentage
function formatPercent(num: number): string {
  return `${num.toFixed(1)}%`
}

// Time ago helper
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function AnalyticsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(searchParams.get('range') || '30')
  const [selectedSites, setSelectedSites] = useState<Set<string>>(
    new Set(searchParams.get('sites')?.split(',').filter(Boolean) || [])
  )
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(
    new Set(searchParams.get('severity')?.split(',').filter(Boolean) || [])
  )
  const [selectedStatus, setSelectedStatus] = useState<Set<string>>(
    new Set(searchParams.get('status')?.split(',').filter(Boolean) || [])
  )
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(searchParams.get('categories')?.split(',').filter(Boolean) || [])
  )
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [compareMode, setCompareMode] = useState(false)
  const [selectedModule, setSelectedModule] = useState<string | null>(searchParams.get('module'))

  // Real data from API
  const [kpis, setKpis] = useState<KPI[]>([])
  const [violationsTrend, setViolationsTrend] = useState<TimeSeriesData[]>([])
  const [topRules, setTopRules] = useState<TopRule[]>([])
  const [sitesPerformance, setSitesPerformance] = useState<any[]>([])

  const [modules, setModules] = useState<ChartModule[]>([
    { id: 'violations-trend', title: 'Violations Over Time', description: 'Stacked by severity', type: 'area', pinned: false, order: 1 },
    { id: 'fix-throughput', title: 'Fix Throughput vs. Intake', description: 'Created vs closed', type: 'line', pinned: false, order: 2 },
    { id: 'risk-reduced', title: 'Risk Reduced ($)', description: 'By severity over time', type: 'bar', pinned: false, order: 3 },
    { id: 'top-rules', title: 'Top Rules Driving Risk', description: 'Ranked by impact', type: 'table', pinned: false, order: 4 },
    { id: 'sites-performance', title: 'Sites by Verdict', description: 'Compliance status distribution', type: 'scatter', pinned: false, order: 5 },
    { id: 'time-to-resolve', title: 'Time to Resolve', description: 'Distribution & percentiles', type: 'bar', pinned: false, order: 6 },
    { id: 'category-breakdown', title: 'Rule Category Breakdown', description: 'By category', type: 'pie', pinned: false, order: 7 },
    { id: 'recurring-pages', title: 'Pages with Recurring Issues', description: 'Top problem pages', type: 'table', pinned: false, order: 8 }
  ])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (timeRange !== '30') params.set('range', timeRange)
    if (selectedSites.size > 0) params.set('sites', Array.from(selectedSites).join(','))
    if (selectedSeverities.size > 0) params.set('severity', Array.from(selectedSeverities).join(','))
    if (selectedStatus.size > 0) params.set('status', Array.from(selectedStatus).join(','))
    if (selectedCategories.size > 0) params.set('categories', Array.from(selectedCategories).join(','))
    if (searchQuery) params.set('q', searchQuery)
    if (selectedModule) params.set('module', selectedModule)

    const queryString = params.toString()
    router.replace(`/dashboard/analytics${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }, [timeRange, selectedSites, selectedSeverities, selectedStatus, selectedCategories, searchQuery, selectedModule, router])

  // Fetch data from APIs
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        const params = new URLSearchParams()
        params.set('range', timeRange)
        if (selectedSites.size > 0) params.set('sites', Array.from(selectedSites).join(','))
        if (selectedSeverities.size > 0) params.set('severity', Array.from(selectedSeverities).join(','))
        
        const queryString = params.toString()

        // Fetch all data in parallel
        const [kpisRes, trendRes, rulesRes, sitesRes] = await Promise.all([
          fetch(`/api/analytics/kpis?${queryString}`),
          fetch(`/api/analytics/violations-trend?${queryString}`),
          fetch(`/api/analytics/top-rules?${queryString}`),
          fetch(`/api/analytics/sites-performance?${queryString}`)
        ])

        if (kpisRes.ok) {
          const kpisData = await kpisRes.json()
          
          // Transform KPI data
          setKpis([
            {
              id: 'open-violations',
              label: 'Open Violations',
              value: kpisData.openViolations?.value || 0,
              delta: kpisData.openViolations?.delta || 0,
              trend: kpisData.openViolations?.delta < 0 ? 'down' : kpisData.openViolations?.delta > 0 ? 'up' : 'neutral',
              sparklineData: kpisData.openViolations?.sparklineData || [],
              icon: AlertTriangle,
              color: 'text-red-600'
            },
            {
              id: 'compliance-status',
              label: 'Compliance Status',
              value: `${kpisData.compliantSites?.value || 0} Compliant`,
              subtitle: `${kpisData.atRiskSites?.value || 0} At Risk, ${kpisData.nonCompliantSites?.value || 0} Non-Compliant`,
              delta: kpisData.compliantSites?.delta || 0,
              trend: kpisData.compliantSites?.delta > 0 ? 'up' : kpisData.compliantSites?.delta < 0 ? 'down' : 'neutral',
              sparklineData: kpisData.compliantSites?.sparklineData || [],
              icon: Shield,
              color: 'text-emerald-600'
            },
            {
              id: 'fix-velocity',
              label: 'Fix Velocity',
              value: `${(kpisData.fixVelocity?.value || 0).toFixed(0)}/wk`,
              delta: kpisData.fixVelocity?.delta || 0,
              trend: kpisData.fixVelocity?.delta > 0 ? 'up' : kpisData.fixVelocity?.delta < 0 ? 'down' : 'neutral',
              sparklineData: kpisData.fixVelocity?.sparklineData || [],
              icon: Zap,
              color: 'text-blue-600'
            },
            {
              id: 'mttr',
              label: 'MTTR',
              value: `${(kpisData.mttr?.value || 0).toFixed(1)} days`,
              delta: kpisData.mttr?.delta || 0,
              trend: kpisData.mttr?.delta < 0 ? 'down' : kpisData.mttr?.delta > 0 ? 'up' : 'neutral',
              sparklineData: kpisData.mttr?.sparklineData || [],
              icon: Clock,
              color: 'text-purple-600'
            }
          ])
        }

        if (trendRes.ok) {
          const trendData = await trendRes.json()
          setViolationsTrend(trendData.data || [])
        }

        if (rulesRes.ok) {
          const rulesData = await rulesRes.json()
          setTopRules(rulesData.data || [])
        }

        if (sitesRes.ok) {
          const sitesData = await sitesRes.json()
          setSitesPerformance(sitesData.data || [])
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching analytics:', error)
        setLoading(false)
      }
    }
    fetchData()
  }, [timeRange, selectedSites, selectedSeverities, selectedStatus, selectedCategories])

  // Clear filters
  const clearFilters = () => {
    setTimeRange('30')
    setSelectedSites(new Set())
    setSelectedSeverities(new Set())
    setSelectedStatus(new Set())
    setSelectedCategories(new Set())
    setSearchQuery('')
  }

  const hasActiveFilters = timeRange !== '30' || selectedSites.size > 0 || selectedSeverities.size > 0 || 
                           selectedStatus.size > 0 || selectedCategories.size > 0 || searchQuery

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-600">Performance insights & trends</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Save className="w-4 h-4 inline mr-2" />
                Save view
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Mail className="w-4 h-4 inline mr-2" />
                Schedule
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4 inline mr-2" />
                Export
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search rules, pages, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Time Range */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="month">This month</option>
                <option value="quarter">This quarter</option>
              </select>

              <div className="w-px h-6 bg-gray-200" />

              {/* Severity filters */}
              {(['Critical', 'Serious', 'Moderate', 'Minor'] as const).map((severity) => {
                const isActive = selectedSeverities.has(severity.toLowerCase())
                return (
                  <button
                    key={severity}
                    onClick={() => {
                      const newSet = new Set(selectedSeverities)
                      if (isActive) newSet.delete(severity.toLowerCase())
                      else newSet.add(severity.toLowerCase())
                      setSelectedSeverities(newSet)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {severity}
                  </button>
                )
              })}

              <div className="w-px h-6 bg-gray-200" />

              {/* Status filters */}
              {(['Open', 'Fixed', 'Ignored'] as const).map((status) => {
                const isActive = selectedStatus.has(status.toLowerCase())
                return (
                  <button
                    key={status}
                    onClick={() => {
                      const newSet = new Set(selectedStatus)
                      if (isActive) newSet.delete(status.toLowerCase())
                      else newSet.add(status.toLowerCase())
                      setSelectedStatus(newSet)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {status}
                  </button>
                )
              })}

              {hasActiveFilters && (
                <>
                  <div className="w-px h-6 bg-gray-200" />
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Clear filters
                  </button>
                </>
              )}

              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    compareMode
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Compare mode
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPI Deck */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {kpis.map((kpi) => {
                const Icon = kpi.icon
                const isPositive = kpi.trend === 'up' && (kpi.id === 'compliance-status' || kpi.id === 'fix-velocity') ||
                                   kpi.trend === 'down' && (kpi.id === 'open-violations' || kpi.id === 'mttr')
                const TrendIcon = kpi.delta > 0 ? TrendingUp : kpi.delta < 0 ? TrendingDown : Minus

                return (
                  <div
                    key={kpi.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center ${kpi.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        isPositive ? 'text-emerald-600' : kpi.delta === 0 ? 'text-gray-600' : 'text-red-600'
                      }`}>
                        <TrendIcon className="w-3 h-3" />
                        {Math.abs(kpi.delta).toFixed(1)}%
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="text-2xl font-semibold text-gray-900 mb-1">{kpi.value}</div>
                      <div className="text-sm text-gray-600">{kpi.label}</div>
                      {kpi.subtitle && (
                        <div className="text-xs text-gray-500 mt-0.5">{kpi.subtitle}</div>
                      )}
                    </div>

                    {/* Mini sparkline */}
                    <div className="h-8">
                      <svg width="100%" height="100%" viewBox="0 0 100 32">
                        <polyline
                          points={kpi.sparklineData.map((val, i) => {
                            const x = (i / (kpi.sparklineData.length - 1)) * 100
                            const max = Math.max(...kpi.sparklineData)
                            const min = Math.min(...kpi.sparklineData)
                            const y = 32 - ((val - min) / (max - min)) * 28
                            return `${x},${y}`
                          }).join(' ')}
                          fill="none"
                          stroke={isPositive ? '#10b981' : '#ef4444'}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    <button className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
                      View details →
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Chart Modules */}
            <ViolationsTrendModule compareMode={compareMode} data={violationsTrend} />
            <FixThroughputModule compareMode={compareMode} data={violationsTrend} />
            <RiskReducedModule compareMode={compareMode} />
            <TopRulesModule data={topRules} />
            <SitesPerformanceModule data={sitesPerformance} />
            <TimeToResolveModule />
            <CategoryBreakdownModule />
            <RecurringPagesModule />
          </div>
        )}
      </div>
    </div>
  )
}

// Chart Module Components
function ViolationsTrendModule({ compareMode, data }: { compareMode: boolean; data: TimeSeriesData[] }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard
        title="Violations Over Time"
        description="Stacked by severity with fix throughput overlay"
      >
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No data available. Run a scan to see trends.
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="Violations Over Time"
      description="Stacked by severity with fix throughput overlay"
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey="critical" stackId="1" stroke={severityColors.critical} fill={severityColors.critical} fillOpacity={0.6} name="Critical" />
          <Area type="monotone" dataKey="serious" stackId="1" stroke={severityColors.serious} fill={severityColors.serious} fillOpacity={0.6} name="Serious" />
          <Area type="monotone" dataKey="moderate" stackId="1" stroke={severityColors.moderate} fill={severityColors.moderate} fillOpacity={0.6} name="Moderate" />
          <Area type="monotone" dataKey="minor" stackId="1" stroke={severityColors.minor} fill={severityColors.minor} fillOpacity={0.6} name="Minor" />
          <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} name="Closed" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function FixThroughputModule({ compareMode, data }: { compareMode: boolean; data: TimeSeriesData[] }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard
        title="Fix Throughput vs. Intake"
        description="Created vs closed per week"
      >
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No data available. Run a scan to see throughput.
        </div>
      </ChartCard>
    )
  }

  const onTrack = data[data.length - 1].closed >= data[data.length - 1].created

  return (
    <ChartCard
      title="Fix Throughput vs. Intake"
      description="Created vs closed per week"
      badge={onTrack ? { text: 'On track', color: 'emerald' } : { text: 'Falling behind', color: 'red' }}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="created" stroke="#ef4444" strokeWidth={2} name="Created" dot={{ r: 4 }} />
          <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} name="Closed" dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function RiskReducedModule({ compareMode }: { compareMode: boolean }) {
  const data: RiskData[] = [
    { date: '2024-09-01', riskCreated: 12500, riskReduced: 8200, cumulative: 8200 },
    { date: '2024-09-08', riskCreated: 14200, riskReduced: 9800, cumulative: 18000 },
    { date: '2024-09-15', riskCreated: 10100, riskReduced: 11500, cumulative: 29500 },
    { date: '2024-09-22', riskCreated: 11800, riskReduced: 10200, cumulative: 39700 },
    { date: '2024-09-29', riskCreated: 9200, riskReduced: 12300, cumulative: 52000 }
  ]

  return (
    <ChartCard
      title="Risk Reduced ($)"
      description="Modeled financial risk by severity over time"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tickFormatter={formatDate} stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis yAxisId="left" stroke="#9ca3af" style={{ fontSize: '12px' }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
          <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" style={{ fontSize: '12px' }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(value: any) => formatCurrency(value)} />
          <Legend />
          <Bar yAxisId="left" dataKey="riskReduced" fill="#10b981" name="Risk Reduced" />
          <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={2} name="Cumulative YTD" dot={{ r: 4 }} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

function TopRulesModule({ data }: { data: TopRule[] }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard
        title="Top Rules Driving Risk"
        description="Ranked by count × severity weight"
      >
        <div className="py-12 text-center text-gray-500">
          No violations found. Great job!
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title="Top Rules Driving Risk"
      description="Ranked by count × severity weight"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Rule</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Severity</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Count</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Risk Score</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Sites</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((rule, idx) => (
              <tr key={rule.ruleId} className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900">{rule.ruleName}</div>
                  <div className="text-xs text-gray-500 font-mono">{rule.ruleId}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    {rule.category}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${
                    rule.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                    rule.severity === 'serious' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {rule.severity}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-medium text-gray-900">{rule.count}</td>
                <td className="py-3 px-4 text-right font-medium text-gray-900">{formatNumber(rule.riskScore)}</td>
                <td className="py-3 px-4 text-right text-gray-600">{rule.sites}</td>
                <td className="py-3 px-4 text-right">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}

function SitesPerformanceModule({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <ChartCard
        title="Sites by Verdict"
        description="Compliance status distribution with issue counts"
      >
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No sites data available. Add sites to see performance.
        </div>
      </ChartCard>
    )
  }

  // Group sites by verdict
  const verdictGroups = {
    compliant: data.filter(s => s.verdict === 'compliant' || s.verdict === 'Compliant'),
    'at-risk': data.filter(s => s.verdict === 'at-risk' || s.verdict === 'At Risk'),
    'non-compliant': data.filter(s => s.verdict === 'non-compliant' || s.verdict === 'Non-Compliant')
  }

  return (
    <ChartCard
      title="Sites by Verdict"
      description="Compliance status distribution with issue counts"
    >
      <div className="grid grid-cols-3 gap-4 p-4">
        {/* Compliant Sites */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">Compliant</h4>
          </div>
          <div className="text-3xl font-bold text-green-700 dark:text-green-300 mb-1">
            {verdictGroups.compliant.length}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">
            {verdictGroups.compliant.length === 1 ? 'site' : 'sites'}
          </div>
          {verdictGroups.compliant.length > 0 && (
            <div className="mt-2 text-xs text-green-700 dark:text-green-300">
              Total: {verdictGroups.compliant.reduce((sum, s) => sum + (s.issueCount || 0), 0)} issues
            </div>
          )}
        </div>

        {/* At Risk Sites */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">At Risk</h4>
          </div>
          <div className="text-3xl font-bold text-amber-700 dark:text-amber-300 mb-1">
            {verdictGroups['at-risk'].length}
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400">
            {verdictGroups['at-risk'].length === 1 ? 'site' : 'sites'}
          </div>
          {verdictGroups['at-risk'].length > 0 && (
            <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Total: {verdictGroups['at-risk'].reduce((sum, s) => sum + (s.issueCount || 0), 0)} issues
            </div>
          )}
        </div>

        {/* Non-Compliant Sites */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <h4 className="text-sm font-semibold text-red-900 dark:text-red-100">Non-Compliant</h4>
          </div>
          <div className="text-3xl font-bold text-red-700 dark:text-red-300 mb-1">
            {verdictGroups['non-compliant'].length}
          </div>
          <div className="text-xs text-red-600 dark:text-red-400">
            {verdictGroups['non-compliant'].length === 1 ? 'site' : 'sites'}
          </div>
          {verdictGroups['non-compliant'].length > 0 && (
            <div className="mt-2 text-xs text-red-700 dark:text-red-300">
              Total: {verdictGroups['non-compliant'].reduce((sum, s) => sum + (s.issueCount || 0), 0)} issues
            </div>
          )}
        </div>
      </div>
    </ChartCard>
  )
}

function TimeToResolveModule() {
  const data = [
    { range: '0-2 days', count: 45, p50: true },
    { range: '2-4 days', count: 68, p75: true },
    { range: '4-7 days', count: 52 },
    { range: '7-14 days', count: 28, p90: true },
    { range: '14+ days', count: 12 }
  ]

  return (
    <ChartCard
      title="Time to Resolve Distribution"
      description="Histogram with P50, P75, P90 markers"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="range" stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.p50 || entry.p75 || entry.p90 ? '#10b981' : '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex items-center gap-6 text-xs text-gray-600">
        <div>P50: <span className="font-semibold text-gray-900">2.1 days</span></div>
        <div>P75: <span className="font-semibold text-gray-900">4.3 days</span></div>
        <div>P90: <span className="font-semibold text-gray-900">8.5 days</span></div>
      </div>
    </ChartCard>
  )
}

function CategoryBreakdownModule() {
  const data = [
    { name: 'Forms', value: 85, color: categoryColors.Forms },
    { name: 'Color', value: 68, color: categoryColors.Color },
    { name: 'ARIA', value: 52, color: categoryColors.ARIA },
    { name: 'Landmark', value: 45, color: categoryColors.Landmark },
    { name: 'Keyboard', value: 28, color: categoryColors.Keyboard },
    { name: 'Media', value: 15, color: categoryColors.Media }
  ]

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <ChartCard
      title="Rule Category Breakdown"
      description="Distribution by rule category"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ResponsiveContainer width="100%" height={300}>
          <RechartsPie>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </RechartsPie>
        </ResponsiveContainer>

        <div className="flex flex-col justify-center space-y-3">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-medium text-gray-700">{item.name}</span>
              </div>
              <div className="text-sm text-gray-900">
                <span className="font-semibold">{item.value}</span>
                <span className="text-gray-500 ml-1">({((item.value / total) * 100).toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}

function RecurringPagesModule() {
  const data = [
    { path: '/dashboard', occurrences: 18, uniqueRules: 5, lastSeen: '2024-09-29', trend: 'up' },
    { path: '/pricing', occurrences: 15, uniqueRules: 4, lastSeen: '2024-09-28', trend: 'down' },
    { path: '/features', occurrences: 12, uniqueRules: 3, lastSeen: '2024-09-29', trend: 'up' },
    { path: '/about', occurrences: 8, uniqueRules: 2, lastSeen: '2024-09-27', trend: 'neutral' }
  ]

  return (
    <ChartCard
      title="Pages with Recurring Issues"
      description="Pages with the most violations over time"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Page Path</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Occurrences</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Unique Rules</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Last Seen</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Trend</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.map((page, idx) => (
              <tr key={page.path} className={`hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="py-3 px-4">
                  <div className="font-mono text-sm text-gray-900">{page.path}</div>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[100px]">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${(page.occurrences / 20) * 100}%` }}
                      />
                    </div>
                    <span className="font-medium text-gray-900 w-8">{page.occurrences}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-gray-600">{page.uniqueRules}</td>
                <td className="py-3 px-4 text-right text-gray-600 text-sm">{formatDate(page.lastSeen)}</td>
                <td className="py-3 px-4 text-right">
                  {page.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-600 inline" />}
                  {page.trend === 'down' && <TrendingDown className="w-4 h-4 text-emerald-600 inline" />}
                  {page.trend === 'neutral' && <Minus className="w-4 h-4 text-gray-400 inline" />}
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}

// Chart Card Wrapper Component
function ChartCard({
  title,
  description,
  badge,
  children
}: {
  title: string
  description: string
  badge?: { text: string; color: 'emerald' | 'red' }
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button className="p-1 hover:bg-gray-100 rounded transition-colors">
              <Info className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              badge.color === 'emerald' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {badge.text}
            </span>
          )}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {children}
    </div>
  )
}


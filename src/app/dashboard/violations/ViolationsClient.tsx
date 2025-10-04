'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
  Search, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Filter,
  X,
  Globe,
  TrendingDown,
  TrendingUp,
  Shield,
  Loader2,
  
  
  
  CheckCircle,
  Play,
  AlertTriangle
} from 'lucide-react'
import { calculateVerdict } from '@/lib/verdict-system'

// Type definitions
interface Violation {
  id: string
  rule: string
  ruleName: string
  severity: string
  affectedSites: number
  instances: number
  status: string
  lastSeen: string
  wcagRef: string
  description: string
  helpUrl: string
}

interface KPIs {
  totalViolations: number
  criticalIssues: number
  seriousIssues?: number
  moderateIssues?: number
  minorIssues?: number
  fixedCount: number
  openCount: number
  fixedPercentage: number
  affectedSites: number
  // Trends (compared to previous period)
  totalTrend?: number
  criticalTrend?: number
  fixedTrend?: number
  sitesTrend?: number
}

// Sparkline component
function MiniSparkline({ data, color = '#3B82F6' }: { data: number[]; color?: string }) {
  if (data.length === 0) return null
  
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')
  
  return (
    <svg 
      className="w-full h-8" 
      viewBox="0 0 100 100" 
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="4"
        vectorEffect="non-scaling-stroke"
        className="opacity-50"
      />
    </svg>
  )
}

// Severity Breakdown Chart
function SeverityBreakdownChart({ 
  violations, 
  onSeverityClick 
}: { 
  violations: Violation[]
  onSeverityClick: (severity: string | null) => void 
}) {
  const counts = {
    critical: violations.filter(v => v.severity === 'critical').reduce((sum, v) => sum + v.instances, 0),
    serious: violations.filter(v => v.severity === 'serious').reduce((sum, v) => sum + v.instances, 0),
    moderate: violations.filter(v => v.severity === 'moderate').reduce((sum, v) => sum + v.instances, 0),
    minor: violations.filter(v => v.severity === 'minor').reduce((sum, v) => sum + v.instances, 0),
  }
  
  const total = counts.critical + counts.serious + counts.moderate + counts.minor
  
  if (total === 0) return null
  
  const percentages = {
    critical: (counts.critical / total) * 100,
    serious: (counts.serious / total) * 100,
    moderate: (counts.moderate / total) * 100,
    minor: (counts.minor / total) * 100,
  }
  
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm mb-8">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
        Violations by Severity
      </h3>
      
      {/* Stacked Bar */}
      <div className="flex h-12 rounded-lg overflow-hidden border border-gray-200 mb-4">
        {percentages.critical > 0 && (
          <button
            onClick={() => onSeverityClick('critical')}
            className="bg-red-500 hover:bg-red-600 transition-colors relative group"
            style={{ width: `${percentages.critical}%` }}
            title={`Critical: ${counts.critical} (${percentages.critical.toFixed(1)}%)`}
          >
            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              {percentages.critical.toFixed(0)}%
            </span>
          </button>
        )}
        {percentages.serious > 0 && (
          <button
            onClick={() => onSeverityClick('serious')}
            className="bg-orange-500 hover:bg-orange-600 transition-colors relative group"
            style={{ width: `${percentages.serious}%` }}
            title={`Serious: ${counts.serious} (${percentages.serious.toFixed(1)}%)`}
          >
            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              {percentages.serious.toFixed(0)}%
            </span>
          </button>
        )}
        {percentages.moderate > 0 && (
          <button
            onClick={() => onSeverityClick('moderate')}
            className="bg-amber-500 hover:bg-amber-600 transition-colors relative group"
            style={{ width: `${percentages.moderate}%` }}
            title={`Moderate: ${counts.moderate} (${percentages.moderate.toFixed(1)}%)`}
          >
            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              {percentages.moderate.toFixed(0)}%
            </span>
          </button>
        )}
        {percentages.minor > 0 && (
          <button
            onClick={() => onSeverityClick('minor')}
            className="bg-blue-500 hover:bg-blue-600 transition-colors relative group"
            style={{ width: `${percentages.minor}%` }}
            title={`Minor: ${counts.minor} (${percentages.minor.toFixed(1)}%)`}
          >
            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              {percentages.minor.toFixed(0)}%
            </span>
          </button>
        )}
      </div>
      
      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onSeverityClick('critical')}
          className="flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors"
        >
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-gray-700">Critical</span>
          <span className="ml-auto font-semibold text-gray-900">{counts.critical}</span>
        </button>
        <button
          onClick={() => onSeverityClick('serious')}
          className="flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors"
        >
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span className="text-gray-700">Serious</span>
          <span className="ml-auto font-semibold text-gray-900">{counts.serious}</span>
        </button>
        <button
          onClick={() => onSeverityClick('moderate')}
          className="flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors"
        >
          <div className="w-3 h-3 rounded bg-amber-500" />
          <span className="text-gray-700">Moderate</span>
          <span className="ml-auto font-semibold text-gray-900">{counts.moderate}</span>
        </button>
        <button
          onClick={() => onSeverityClick('minor')}
          className="flex items-center gap-2 text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors"
        >
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-gray-700">Minor</span>
          <span className="ml-auto font-semibold text-gray-900">{counts.minor}</span>
        </button>
      </div>
    </div>
  )
}

// Mock data for fallback
const mockViolations: Violation[] = [
  {
    id: '1',
    rule: 'image-alt',
    ruleName: 'Images must have alternate text',
    severity: 'critical',
    affectedSites: 3,
    instances: 47,
    status: 'open',
    lastSeen: '2024-01-15T10:30:00Z',
    wcagRef: 'WCAG 1.1.1',
    description: 'Ensures <img> elements have alternate text or a role of none or presentation',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/image-alt'
  },
  {
    id: '2',
    rule: 'color-contrast',
    ruleName: 'Elements must have sufficient color contrast',
    severity: 'serious',
    affectedSites: 5,
    instances: 124,
    status: 'open',
    lastSeen: '2024-01-15T09:15:00Z',
    wcagRef: 'WCAG 1.4.3',
    description: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/color-contrast'
  },
  {
    id: '3',
    rule: 'label',
    ruleName: 'Form elements must have labels',
    severity: 'critical',
    affectedSites: 2,
    instances: 23,
    status: 'open',
    lastSeen: '2024-01-14T16:45:00Z',
    wcagRef: 'WCAG 1.3.1, 4.1.2',
    description: 'Ensures every form element has a label',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/label'
  },
  {
    id: '4',
    rule: 'link-name',
    ruleName: 'Links must have discernible text',
    severity: 'serious',
    affectedSites: 4,
    instances: 89,
    status: 'fixed',
    lastSeen: '2024-01-13T14:20:00Z',
    wcagRef: 'WCAG 2.4.4, 4.1.2',
    description: 'Ensures links have discernible text',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/link-name'
  },
  {
    id: '5',
    rule: 'button-name',
    ruleName: 'Buttons must have discernible text',
    severity: 'critical',
    affectedSites: 1,
    instances: 12,
    status: 'open',
    lastSeen: '2024-01-15T08:00:00Z',
    wcagRef: 'WCAG 4.1.2',
    description: 'Ensures buttons have discernible text',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/button-name'
  },
  {
    id: '6',
    rule: 'aria-required-attr',
    ruleName: 'Required ARIA attributes must be provided',
    severity: 'moderate',
    affectedSites: 2,
    instances: 34,
    status: 'open',
    lastSeen: '2024-01-15T11:00:00Z',
    wcagRef: 'WCAG 4.1.2',
    description: 'Ensures elements with ARIA roles have all required ARIA attributes',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/aria-required-attr'
  },
  {
    id: '7',
    rule: 'heading-order',
    ruleName: 'Heading levels should only increase by one',
    severity: 'minor',
    affectedSites: 6,
    instances: 156,
    status: 'open',
    lastSeen: '2024-01-14T13:30:00Z',
    wcagRef: 'WCAG 1.3.1',
    description: 'Ensures the order of headings is semantically correct',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/heading-order'
  },
]

const severityConfig = {
  critical: {
    label: 'Critical',
    color: 'text-red-700 bg-red-50 border-red-200',
    dotColor: 'bg-red-500',
  },
  serious: {
    label: 'Serious',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    dotColor: 'bg-orange-500',
  },
  moderate: {
    label: 'Moderate',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  minor: {
    label: 'Minor',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    dotColor: 'bg-blue-500',
  },
}

const statusConfig = {
  open: {
    label: 'Open',
    color: 'text-red-700 bg-red-50 border-red-200',
    icon: AlertCircle,
  },
  fixed: {
    label: 'Fixed',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: CheckCircle2,
  },
  ignored: {
    label: 'Ignored',
    color: 'text-gray-700 bg-gray-50 border-gray-200',
    icon: Clock,
  },
}

export function ViolationsClient() {
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedRule, setSelectedRule] = useState<Violation | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [violations, setViolations] = useState<Violation[]>([])
  const [kpis, setKpis] = useState<KPIs>({
    totalViolations: 0,
    criticalIssues: 0,
    seriousIssues: 0,
    moderateIssues: 0,
    minorIssues: 0,
    fixedCount: 0,
    openCount: 0,
    fixedPercentage: 0,
    affectedSites: 0,
  })

  // Calculate current period verdict
  const periodVerdict = useMemo(() => {
    return calculateVerdict(
      kpis.criticalIssues || 0,
      kpis.seriousIssues || 0,
      kpis.moderateIssues || 0,
      kpis.minorIssues || 0
    )
  }, [kpis.criticalIssues, kpis.seriousIssues, kpis.moderateIssues, kpis.minorIssues])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch violations data
  useEffect(() => {
    async function fetchViolations() {
      try {
        setLoading(true)
        setError(null)
        
        const params = new URLSearchParams()
        if (severityFilter) params.append('severity', severityFilter)
        if (statusFilter) params.append('status', statusFilter)
        
        const response = await fetch(`/api/violations?${params.toString()}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch violations')
        }
        
        const data = await response.json()
        setViolations(data.violations || [])
        
        // Calculate severity breakdown from violations
        const critical = (data.violations || []).filter((v: Violation) => v.severity === 'critical').length
        const serious = (data.violations || []).filter((v: Violation) => v.severity === 'serious').length
        const moderate = (data.violations || []).filter((v: Violation) => v.severity === 'moderate').length
        const minor = (data.violations || []).filter((v: Violation) => v.severity === 'minor').length
        
        setKpis(data.kpis || {
          totalViolations: 0,
          criticalIssues: critical,
          seriousIssues: serious,
          moderateIssues: moderate,
          minorIssues: minor,
          fixedCount: 0,
          openCount: 0,
          fixedPercentage: 0,
          affectedSites: 0,
        })
      } catch (err) {
        console.error('Error fetching violations:', err)
        setError(err instanceof Error ? err.message : 'Failed to load violations')
        // Use mock data as fallback
        setViolations(mockViolations)
      } finally {
        setLoading(false)
      }
    }

    fetchViolations()
  }, [severityFilter, statusFilter])

  // Fuzzy search helper
  const fuzzyMatch = (str: string, query: string): boolean => {
    const lowerStr = str.toLowerCase()
    const lowerQuery = query.toLowerCase()
    
    // Exact match
    if (lowerStr.includes(lowerQuery)) return true
    
    // Fuzzy match - check if all query characters appear in order
    let strIndex = 0
    for (const char of lowerQuery) {
      strIndex = lowerStr.indexOf(char, strIndex)
      if (strIndex === -1) return false
      strIndex++
    }
    return true
  }

  // Filter violations by search query (client-side with fuzzy matching)
  const filteredViolations = useMemo(() => {
    return violations.filter(violation => {
      if (!searchQuery) return true
      
      return fuzzyMatch(violation.ruleName, searchQuery) ||
             fuzzyMatch(violation.rule, searchQuery) ||
             fuzzyMatch(violation.description, searchQuery)
    })
  }, [violations, searchQuery])

  const handleRuleClick = (violation: Violation) => {
    setSelectedRule(violation)
    setSidebarOpen(true)
  }

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Exporting violations to CSV...')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
          {/* Title + Export */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1.5">
                Violations
              </h1>
              <p className="text-sm text-gray-600">
                Track and resolve accessibility issues across your sites
              </p>
            </div>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search violations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Severity Filter */}
            <div className="relative">
              <button
                onClick={() => setSeverityFilter(null)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  severityFilter
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>{severityFilter ? severityConfig[severityFilter as keyof typeof severityConfig].label : 'All Severities'}</span>
                {severityFilter && (
                  <X 
                    className="w-3 h-3 ml-1" 
                    onClick={(e) => {
                      e.stopPropagation()
                      setSeverityFilter(null)
                    }}
                  />
                )}
              </button>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <button
                onClick={() => setStatusFilter(null)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                  statusFilter
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>{statusFilter ? statusConfig[statusFilter as keyof typeof statusConfig].label : 'All Status'}</span>
                {statusFilter && (
                  <X 
                    className="w-3 h-3 ml-1" 
                    onClick={(e) => {
                      e.stopPropagation()
                      setStatusFilter(null)
                    }}
                  />
                )}
              </button>
            </div>

            <div className="ml-auto text-sm text-gray-600">
              <span className="font-medium">{filteredViolations.length}</span> of{' '}
              <span className="font-medium">{violations.length}</span> violations
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <>
            {/* Global Verdict Banner */}
            <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {periodVerdict.status === 'compliant' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : periodVerdict.status === 'at-risk' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {periodVerdict.title}
                    </h2>
                    <p className="text-sm text-gray-500">{periodVerdict.riskLevel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {kpis.criticalIssues > 0 && (
                    <div className="text-center px-3 py-1.5 bg-red-50 rounded border border-red-200">
                      <div className="text-lg font-semibold text-red-700">{kpis.criticalIssues}</div>
                      <div className="text-xs text-red-600">Critical</div>
                    </div>
                  )}
                  {(kpis.seriousIssues || 0) > 0 && (
                    <div className="text-center px-3 py-1.5 bg-orange-50 rounded border border-orange-200">
                      <div className="text-lg font-semibold text-orange-700">{kpis.seriousIssues}</div>
                      <div className="text-xs text-orange-600">Serious</div>
                    </div>
                  )}
                  {(kpis.moderateIssues || 0) > 0 && (
                    <div className="text-center px-3 py-1.5 bg-yellow-50 rounded border border-yellow-200">
                      <div className="text-lg font-semibold text-yellow-700">{kpis.moderateIssues}</div>
                      <div className="text-xs text-yellow-600">Moderate</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* KPI Cards with Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Violations */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center border border-purple-200">
                    <AlertCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  {kpis.totalTrend !== undefined && kpis.totalTrend !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${kpis.totalTrend > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {kpis.totalTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(kpis.totalTrend)}%
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{kpis.totalViolations}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide font-medium mb-2">Total Violations</div>
                <MiniSparkline data={[450, 420, 480, 460, kpis.totalViolations]} color="#9333ea" />
              </div>

              {/* Critical Issues */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center border border-red-200">
                    <Shield className="w-5 h-5 text-red-600" />
                  </div>
                  {kpis.criticalTrend !== undefined && kpis.criticalTrend !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${kpis.criticalTrend > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {kpis.criticalTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(kpis.criticalTrend)}%
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-red-600 mb-1">{kpis.criticalIssues}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide font-medium mb-2">Critical Issues</div>
                <MiniSparkline data={[95, 87, 92, 85, kpis.criticalIssues]} color="#dc2626" />
              </div>

              {/* Fixed Rate */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-200">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  {kpis.fixedTrend !== undefined && kpis.fixedTrend !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${kpis.fixedTrend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {kpis.fixedTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(kpis.fixedTrend)}%
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-emerald-600 mb-1">{kpis.fixedPercentage.toFixed(0)}%</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide font-medium mb-2">Fixed Rate</div>
                <MiniSparkline data={[25, 30, 35, 38, kpis.fixedPercentage]} color="#059669" />
              </div>

              {/* Sites Affected */}
              <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-200">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  {kpis.sitesTrend !== undefined && kpis.sitesTrend !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${kpis.sitesTrend > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {kpis.sitesTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(kpis.sitesTrend)}%
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{kpis.affectedSites}</div>
                <div className="text-xs text-gray-600 uppercase tracking-wide font-medium mb-2">Sites Affected</div>
                <MiniSparkline data={[8, 7, 9, 8, kpis.affectedSites]} color="#2563eb" />
              </div>
            </div>

            {/* Severity Breakdown Chart */}
            <SeverityBreakdownChart 
              violations={violations} 
              onSeverityClick={(severity) => setSeverityFilter(severity)} 
            />
          </>
        )}

        {/* Violations Table */}
        {!loading && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Rule Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Severity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Affected Sites
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Instances
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Last Seen
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredViolations.map((violation, idx) => {
                  const severity = severityConfig[violation.severity as keyof typeof severityConfig]
                  const status = statusConfig[violation.status as keyof typeof statusConfig]
                  const StatusIcon = status.icon

                  return (
                    <tr
                      key={violation.id}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      onClick={() => handleRuleClick(violation)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${severity.dotColor}`} />
                          <div>
                            <div className="font-medium text-gray-900">{violation.ruleName}</div>
                            <div className="text-xs text-gray-500 font-mono">{violation.rule}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${severity.color}`}>
                          {severity.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{violation.affectedSites}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">{violation.instances}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${status.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {new Date(violation.lastSeen).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRuleClick(violation)
                          }}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                        >
                          View Details
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Enhanced Empty State */}
          {filteredViolations.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-200">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Great job! No violations detected 🎉
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {searchQuery || severityFilter || statusFilter
                  ? 'Try adjusting your filters or search query to see more results'
                  : 'Your sites are maintaining excellent accessibility standards'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSeverityFilter(null)
                    setStatusFilter(null)
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Run a New Scan
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Detail Sidebar */}
      {sidebarOpen && selectedRule && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gray-900/50 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900">Violation Details</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Rule Info */}
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${severityConfig[selectedRule.severity as keyof typeof severityConfig].dotColor}`} />
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {selectedRule.ruleName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{selectedRule.description}</p>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${severityConfig[selectedRule.severity as keyof typeof severityConfig].color}`}>
                        {severityConfig[selectedRule.severity as keyof typeof severityConfig].label}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-600">{selectedRule.wcagRef}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{selectedRule.instances}</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-medium">Instances</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{selectedRule.affectedSites}</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-medium">Sites</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {new Date(selectedRule.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-medium">Last Seen</div>
                </div>
              </div>

              {/* WCAG Reference */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">WCAG Reference</h4>
                <p className="text-sm text-blue-800">{selectedRule.wcagRef}</p>
                <a
                  href={selectedRule.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium"
                >
                  Learn more
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Screenshot Placeholder */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Example Screenshot</h4>
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg h-48 flex items-center justify-center">
                  <p className="text-sm text-gray-500">Screenshot placeholder</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                  Create GitHub Issue
                </button>
                <button className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors">
                  Ignore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


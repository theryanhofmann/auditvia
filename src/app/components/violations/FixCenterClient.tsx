'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Zap,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Play,
  Github,
  ExternalLink,
  Loader2,
  User,
  Code,
  Shield,
  Activity
} from 'lucide-react'
import { formatNumber, formatCurrency } from '@/lib/reports-utils'
import { RESEARCH_BASED_WEIGHTS } from '@/lib/risk-methodology'

interface ViolationIssue {
  id: string
  rule: string
  description: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  selector: string
  help_url: string
  wcag_ref: string
  site_id: string
  site_name?: string
}

interface ViolationCluster {
  rule: string
  description: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  instanceCount: number
  affectedSites: number
  wcagRef: string
  helpUrl: string
  autoFixable: boolean
  issues: ViolationIssue[]
}

interface FixCenterClientProps {
  teamId: string
}

type PersonaMode = 'founder' | 'developer'

export function FixCenterClient({ teamId }: FixCenterClientProps) {
  const router = useRouter()
  const [mode, setMode] = useState<PersonaMode>('founder')
  const [loading, setLoading] = useState(true)
  const [violations, setViolations] = useState<ViolationIssue[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null)

  useEffect(() => {
    fetchViolations()
  }, [teamId])

  const fetchViolations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/violations?teamId=${teamId}`)
      if (response.ok) {
        const data = await response.json()
        setViolations(data.issues || [])
      }
    } catch (error) {
      console.error('Failed to fetch violations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group violations into fixable clusters
  const clusters = useMemo(() => {
    const grouped = new Map<string, ViolationCluster>()

    violations.forEach((violation) => {
      if (!grouped.has(violation.rule)) {
        grouped.set(violation.rule, {
          rule: violation.rule,
          description: violation.description,
          impact: violation.impact,
          instanceCount: 0,
          affectedSites: new Set<string>().size,
          wcagRef: violation.wcag_ref,
          helpUrl: violation.help_url,
          autoFixable: isAutoFixable(violation.rule),
          issues: []
        })
      }

      const cluster = grouped.get(violation.rule)!
      cluster.instanceCount++
      cluster.issues.push(violation)
      
      // Count unique sites
      const siteIds = new Set(cluster.issues.map(i => i.site_id))
      cluster.affectedSites = siteIds.size
    })

    return Array.from(grouped.values()).sort((a, b) => {
      // Sort by impact first (critical → minor), then by instance count
      const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 }
      if (impactOrder[a.impact] !== impactOrder[b.impact]) {
        return impactOrder[a.impact] - impactOrder[b.impact]
      }
      return b.instanceCount - a.instanceCount
    })
  }, [violations])

  // Calculate total risk
  const totalRisk = useMemo(() => {
    return violations.reduce((sum, v) => {
      return sum + RESEARCH_BASED_WEIGHTS[v.impact]
    }, 0)
  }, [violations])

  // Calculate cluster impact
  const getClusterImpact = (cluster: ViolationCluster) => {
    const clusterRisk = cluster.instanceCount * RESEARCH_BASED_WEIGHTS[cluster.impact]
    const impactPercentage = totalRisk > 0 ? (clusterRisk / totalRisk) * 100 : 0
    return {
      risk: clusterRisk,
      percentage: impactPercentage
    }
  }

  // Check if rule is auto-fixable
  const isAutoFixable = (rule: string): boolean => {
    const autoFixableRules = [
      'image-alt',
      'button-name',
      'link-name',
      'form-label',
      'label',
      'html-has-lang',
      'document-title'
    ]
    return autoFixableRules.includes(rule)
  }

  const handleFixCluster = (cluster: ViolationCluster) => {
    console.log('Fix cluster:', cluster.rule)
    // Future: Trigger auto-fix API
  }

  const handleCreateGitHubIssues = (cluster: ViolationCluster) => {
    console.log('Create GitHub issues for:', cluster.rule)
    // Future: Bulk GitHub issue creation
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-semibold text-gray-900">
                  Fix Center
                </h1>
              </div>
              <p className="text-sm text-gray-600">
                One-click actions to resolve accessibility issues by cluster
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setMode('founder')}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                  ${mode === 'founder' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'}
                `}
              >
                <User className="w-4 h-4" />
                Founder
              </button>
              <button
                onClick={() => setMode('developer')}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                  ${mode === 'developer' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'}
                `}
              >
                <Code className="w-4 h-4" />
                Developer
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Total Issues</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatNumber(violations.length)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Clusters</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatNumber(clusters.length)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Auto-Fixable</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatNumber(clusters.filter(c => c.autoFixable).length)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 uppercase tracking-wide">Total Risk</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalRisk)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixable Clusters */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Fixable Clusters
          </h2>
          <p className="text-sm text-gray-600">
            {clusters.length} issue types grouped by rule • Prioritized by impact
          </p>
        </div>

        {clusters.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No issues found
            </h3>
            <p className="text-gray-600">
              All accessibility violations have been resolved
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clusters.map((cluster) => {
              const impact = getClusterImpact(cluster)
              const isExpanded = selectedCluster === cluster.rule

              return (
                <div
                  key={cluster.rule}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  {/* Cluster Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {/* Severity Badge */}
                          <span className={`
                            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${cluster.impact === 'critical' ? 'bg-red-50 text-red-700' :
                              cluster.impact === 'serious' ? 'bg-orange-50 text-orange-700' :
                              cluster.impact === 'moderate' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-gray-50 text-gray-700'}
                          `}>
                            {cluster.impact}
                          </span>

                          {/* Auto-fixable Badge */}
                          {cluster.autoFixable && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              <Zap className="w-3 h-3" />
                              Auto-fixable
                            </span>
                          )}

                          {/* WCAG Reference */}
                          <span className="text-xs text-gray-500">
                            {cluster.wcagRef}
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-gray-900 mb-1">
                          {cluster.description} ({formatNumber(cluster.instanceCount)} instances)
                        </h3>

                        <p className="text-sm text-gray-600">
                          {mode === 'founder'
                            ? `Affects ${cluster.affectedSites} ${cluster.affectedSites === 1 ? 'site' : 'sites'} • ${cluster.autoFixable ? 'Can be fixed automatically' : 'Requires manual review'}`
                            : `Rule: ${cluster.rule} | Occurrences: ${cluster.instanceCount} | Sites: ${cluster.affectedSites}`
                          }
                        </p>
                      </div>

                      {/* Risk Amount */}
                      <div className="text-right ml-4">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(impact.risk)}
                        </div>
                        <div className="text-xs text-gray-500">legal risk</div>
                      </div>
                    </div>

                    {/* Impact Meter */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                        <span>Impact on total risk</span>
                        <span className="font-medium">{impact.percentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            cluster.impact === 'critical' ? 'bg-red-500' :
                            cluster.impact === 'serious' ? 'bg-orange-500' :
                            cluster.impact === 'moderate' ? 'bg-yellow-500' :
                            'bg-gray-400'
                          }`}
                          style={{ width: `${Math.min(impact.percentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        {mode === 'founder'
                          ? `Fixing this cluster reduces ${impact.percentage.toFixed(0)}% of your open risk`
                          : `${impact.percentage.toFixed(1)}% of total legal exposure ($${formatNumber(totalRisk)})`
                        }
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {cluster.autoFixable ? (
                        <button
                          onClick={() => handleFixCluster(cluster)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Zap className="w-4 h-4" />
                          {mode === 'founder' 
                            ? `Fix all ${cluster.instanceCount} issues` 
                            : 'Run Auto-Fix API'
                          }
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedCluster(isExpanded ? null : cluster.rule)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          {mode === 'founder' ? 'Show fix guide' : 'View instances'}
                        </button>
                      )}

                      <button
                        onClick={() => handleCreateGitHubIssues(cluster)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 transition-colors"
                      >
                        <Github className="w-4 h-4" />
                        Create {cluster.instanceCount} GitHub {cluster.instanceCount === 1 ? 'issue' : 'issues'}
                      </button>

                      <a
                        href={cluster.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Learn more
                      </a>
                    </div>
                  </div>

                  {/* Expanded Instance List */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-50 p-5">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        All {cluster.instanceCount} instances
                      </h4>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {cluster.issues.map((issue, idx) => (
                          <div
                            key={issue.id}
                            className="bg-white rounded-md p-3 text-sm border border-gray-200"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-500 mb-1">
                                  {issue.site_name || 'Unknown site'}
                                </div>
                                <code className="text-xs text-gray-700 font-mono break-all">
                                  {issue.selector}
                                </code>
                              </div>
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                #{idx + 1}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}


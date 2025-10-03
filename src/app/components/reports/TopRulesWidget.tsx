'use client'

import { Download, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { exportToCSV, formatNumber } from '@/lib/reports-utils'
import type { TopRule } from '@/types/reports'

interface TopRulesWidgetProps {
  data: TopRule[] | null
  loading: boolean
  onExport?: () => void
}

export function TopRulesWidget({ data, loading, onExport }: TopRulesWidgetProps) {
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-6"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-6">Top Violation Rules</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">No violations found for this time range</p>
        </div>
      </div>
    )
  }

  const handleExport = () => {
    if (!data) return
    exportToCSV(data, 'top-rules', [
      { key: 'rule', label: 'Rule ID' },
      { key: 'impact', label: 'Severity' },
      { key: 'violation_count', label: 'Count' },
      { key: 'affected_sites', label: 'Affected Sites' },
      { key: 'github_issues_created', label: 'GitHub Issues' },
      { key: 'description', label: 'Description' }
    ])
    onExport?.()
  }

  const maxCount = Math.max(...data.map(r => r.violation_count), 1)
  const topRules = data.slice(0, 10)

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Top Violation Rules</h3>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Export top rules data to CSV"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="space-y-3">
        {topRules.map((rule, index) => {
          const widthPercent = (rule.violation_count / maxCount) * 100

          return (
            <div
              key={`${rule.rule}-${index}`}
              className="group relative p-4 bg-gray-750 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-gray-600 transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {rule.rule}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        rule.impact === 'critical'
                          ? 'bg-red-900/50 text-red-300 border border-red-700'
                          : rule.impact === 'serious'
                          ? 'bg-orange-900/50 text-orange-300 border border-orange-700'
                          : rule.impact === 'moderate'
                          ? 'bg-amber-900/50 text-amber-300 border border-amber-700'
                          : 'bg-blue-900/50 text-blue-300 border border-blue-700'
                      }`}
                    >
                      {rule.impact}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{rule.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-lg font-bold text-white">{formatNumber(rule.violation_count)}</span>
                  <span className="text-xs text-gray-500">{rule.affected_sites} sites</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                    rule.impact === 'critical'
                      ? 'bg-red-600'
                      : rule.impact === 'serious'
                      ? 'bg-orange-600'
                      : rule.impact === 'moderate'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${widthPercent}%` }}
                  role="progressbar"
                  aria-valuenow={rule.violation_count}
                  aria-valuemin={0}
                  aria-valuemax={maxCount}
                  aria-label={`${rule.violation_count} violations out of ${maxCount} total`}
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {rule.github_issues_created > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {rule.github_issues_created} issues created
                    </span>
                  )}
                </div>
                {rule.help_url && (
                  <a
                    href={rule.help_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Learn more
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {data.length > 10 && (
        <div className="mt-4 text-center">
          <Link
            href="/dashboard/reports/rules"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            View all {data.length} rules
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

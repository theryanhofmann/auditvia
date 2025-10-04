'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, ExternalLink, Search } from 'lucide-react'
import Link from 'next/link'
import { useTopRules } from '@/hooks/useReportsData'
import { getDateRangeFromTimeRange } from '@/lib/reports-utils'
import { exportToCSV, formatNumber } from '@/lib/reports-utils'
import type { ReportFilters, TimeRange, Severity } from '@/types/reports'

interface RulesTableClientProps {
  teamId: string
}

export function RulesTableClient({ teamId }: RulesTableClientProps) {
  const _router = useRouter()
  const searchParams = useSearchParams()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'count' | 'sites' | 'severity'>('count')
  const [sortDesc, setSortDesc] = useState(true)

  // Build filters from URL
  const timeRange = (searchParams.get('timeRange') as TimeRange) || '30d'
  const siteId = searchParams.get('siteId') || undefined
  const severity = (searchParams.get('severity') as Severity) || undefined
  
  const { startDate, endDate } = getDateRangeFromTimeRange(timeRange)

  const filters: ReportFilters = {
    teamId,
    timeRange,
    siteId,
    severity,
    startDate,
    endDate
  }

  const { data, loading } = useTopRules(filters)

  // Filter and sort
  const filteredData = data
    ?.filter(rule => 
      !searchQuery || 
      rule.rule.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0
      if (sortBy === 'count') {
        comparison = a.violation_count - b.violation_count
      } else if (sortBy === 'sites') {
        comparison = a.affected_sites - b.affected_sites
      } else if (sortBy === 'severity') {
        const severityOrder = { critical: 4, serious: 3, moderate: 2, minor: 1 }
        comparison = severityOrder[a.impact] - severityOrder[b.impact]
      }
      return sortDesc ? -comparison : comparison
    })

  const handleExport = () => {
    if (!filteredData) return
    exportToCSV(filteredData, 'all-rules', [
      { key: 'rule', label: 'Rule ID' },
      { key: 'impact', label: 'Severity' },
      { key: 'violation_count', label: 'Total Count' },
      { key: 'affected_sites', label: 'Affected Sites' },
      { key: 'github_issues_created', label: 'GitHub Issues' },
      { key: 'description', label: 'Description' },
      { key: 'help_url', label: 'Help URL' }
    ])
  }

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc)
    } else {
      setSortBy(column)
      setSortDesc(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/dashboard/reports"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Reports
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">All Violation Rules</h1>
            <p className="text-gray-400">
              Complete list of accessibility rules with violation counts
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={!filteredData || filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search rules by ID or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="mt-4 text-gray-400">Loading rules...</p>
            </div>
          ) : !filteredData || filteredData.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">No rules found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-750 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Rule
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('severity')}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        Severity
                        {sortBy === 'severity' && (sortDesc ? ' ↓' : ' ↑')}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('count')}
                        className="flex items-center gap-1 ml-auto hover:text-white transition-colors"
                      >
                        Count
                        {sortBy === 'count' && (sortDesc ? ' ↓' : ' ↑')}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('sites')}
                        className="flex items-center gap-1 ml-auto hover:text-white transition-colors"
                      >
                        Affected Sites
                        {sortBy === 'sites' && (sortDesc ? ' ↓' : ' ↑')}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Issues
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Help
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredData.map((rule, index) => (
                    <tr key={`${rule.rule}-${index}`} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{rule.rule}</div>
                          <div className="text-xs text-gray-400 mt-1 max-w-md">{rule.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                            rule.impact === 'critical'
                              ? 'bg-red-900/50 text-red-300'
                              : rule.impact === 'serious'
                              ? 'bg-orange-900/50 text-orange-300'
                              : rule.impact === 'moderate'
                              ? 'bg-amber-900/50 text-amber-300'
                              : 'bg-blue-900/50 text-blue-300'
                          }`}
                        >
                          {rule.impact}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-white">
                        {formatNumber(rule.violation_count)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-300">
                        {rule.affected_sites}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-300">
                        {rule.github_issues_created > 0 ? (
                          <span className="text-green-400">{rule.github_issues_created}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {rule.help_url && (
                          <a
                            href={rule.help_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {filteredData && filteredData.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-400">
            Showing {filteredData.length} {filteredData.length === 1 ? 'rule' : 'rules'}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Download, ExternalLink, Search, Globe } from 'lucide-react'
import Link from 'next/link'
import { useTopPages } from '@/hooks/useReportsData'
import { getDateRangeFromTimeRange } from '@/lib/reports-utils'
import { exportToCSV, formatNumber, formatPercent } from '@/lib/reports-utils'
import type { ReportFilters, TimeRange } from '@/types/reports'

interface PagesTableClientProps {
  teamId: string
}

export function PagesTableClient({ teamId }: PagesTableClientProps) {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  
  // Build filters from URL
  const timeRange = (searchParams.get('timeRange') as TimeRange) || '30d'
  const siteId = searchParams.get('siteId') || undefined
  
  const { startDate, endDate } = getDateRangeFromTimeRange(timeRange)

  const filters: ReportFilters = {
    teamId,
    timeRange,
    siteId,
    startDate,
    endDate
  }

  const { data, loading } = useTopPages(filters)

  // Filter
  const filteredData = data?.filter(page => 
    !searchQuery || 
    page.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleExport = () => {
    if (!filteredData) return
    exportToCSV(filteredData, 'all-pages', [
      { key: 'site_name', label: 'Site Name' },
      { key: 'url', label: 'URL' },
      { key: 'total_violations', label: 'Total Violations' },
      { key: 'critical_count', label: 'Critical' },
      { key: 'serious_count', label: 'Serious' },
      { key: 'moderate_count', label: 'Moderate' },
      { key: 'minor_count', label: 'Minor' },
      { key: 'score', label: 'Score' },
      { key: 'last_scan_date', label: 'Last Scanned' }
    ])
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
            <h1 className="text-2xl font-bold text-white mb-2">All Sites</h1>
            <p className="text-gray-400">
              Complete list of sites ranked by violation count
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
              placeholder="Search sites by name or URL..."
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
              <p className="mt-4 text-gray-400">Loading sites...</p>
            </div>
          ) : !filteredData || filteredData.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400">No sites found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-750 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Critical
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Serious
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Moderate
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Minor
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Last Scan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredData.map((page, index) => (
                    <tr key={`${page.site_id}-${index}`} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <Globe className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white text-sm">{page.site_name}</div>
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-1 mt-1"
                            >
                              {page.url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {page.critical_count > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-red-900/50 text-red-300 text-sm font-medium min-w-[2rem]">
                            {page.critical_count}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {page.serious_count > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-orange-900/50 text-orange-300 text-sm font-medium min-w-[2rem]">
                            {page.serious_count}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {page.moderate_count > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-amber-900/50 text-amber-300 text-sm font-medium min-w-[2rem]">
                            {page.moderate_count}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {page.minor_count > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-blue-900/50 text-blue-300 text-sm font-medium min-w-[2rem]">
                            {page.minor_count}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-white">
                        {formatNumber(page.total_violations)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-md text-sm font-medium ${
                            page.score >= 90
                              ? 'bg-green-900/50 text-green-300'
                              : page.score >= 70
                              ? 'bg-amber-900/50 text-amber-300'
                              : 'bg-red-900/50 text-red-300'
                          }`}
                        >
                          {formatPercent(page.score, 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-400">
                        {new Date(page.last_scan_date).toLocaleDateString()}
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
            Showing {filteredData.length} {filteredData.length === 1 ? 'site' : 'sites'}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { Download, ExternalLink, Globe } from 'lucide-react'
import Link from 'next/link'
import { exportToCSV, formatNumber, formatPercent } from '@/lib/reports-utils'
import type { TopPage } from '@/types/reports'

interface TopPagesWidgetProps {
  data: TopPage[] | null
  loading: boolean
  onExport?: () => void
}

export function TopPagesWidget({ data, loading, onExport }: TopPagesWidgetProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-6"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Sites by Violations</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-gray-500">No sites data available</p>
        </div>
      </div>
    )
  }

  const handleExport = () => {
    if (!data) return
    exportToCSV(data, 'top-pages', [
      { key: 'site_name', label: 'Site Name' },
      { key: 'url', label: 'URL' },
      { key: 'total_violations', label: 'Total Violations' },
      { key: 'critical_count', label: 'Critical' },
      { key: 'serious_count', label: 'Serious' },
      { key: 'moderate_count', label: 'Moderate' },
      { key: 'minor_count', label: 'Minor' },
      { key: 'score', label: 'Score' }
    ])
    onExport?.()
  }

  const topPages = data.slice(0, 10)

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Sites by Violations</h3>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Export top pages data to CSV"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="pb-3 text-xs font-medium text-gray-600 uppercase">Site</th>
              <th className="pb-3 text-xs font-medium text-gray-600 uppercase text-center">Critical</th>
              <th className="pb-3 text-xs font-medium text-gray-600 uppercase text-center">Serious</th>
              <th className="pb-3 text-xs font-medium text-gray-600 uppercase text-center">Moderate</th>
              <th className="pb-3 text-xs font-medium text-gray-600 uppercase text-center">Minor</th>
              <th className="pb-3 text-xs font-medium text-gray-600 uppercase text-right">Total</th>
              <th className="pb-3 text-xs font-medium text-gray-600 uppercase text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {topPages.map((page, index) => (
              <tr
                key={`${page.site_id}-${index}`}
                className="border-b border-gray-200 last:border-0 hover:bg-gray-750 transition-colors"
              >
                <td className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Globe className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate max-w-xs">
                        {page.site_name}
                      </div>
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-blue-600 transition-colors truncate block max-w-xs"
                      >
                        {page.url}
                      </a>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-center">
                  {page.critical_count > 0 ? (
                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-red-900/50 text-red-300 text-sm font-medium min-w-[2rem]">
                      {page.critical_count}
                    </span>
                  ) : (
                    <span className="text-gray-600 text-sm">—</span>
                  )}
                </td>
                <td className="py-4 text-center">
                  {page.serious_count > 0 ? (
                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-orange-900/50 text-orange-300 text-sm font-medium min-w-[2rem]">
                      {page.serious_count}
                    </span>
                  ) : (
                    <span className="text-gray-600 text-sm">—</span>
                  )}
                </td>
                <td className="py-4 text-center">
                  {page.moderate_count > 0 ? (
                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-amber-900/50 text-amber-300 text-sm font-medium min-w-[2rem]">
                      {page.moderate_count}
                    </span>
                  ) : (
                    <span className="text-gray-600 text-sm">—</span>
                  )}
                </td>
                <td className="py-4 text-center">
                  {page.minor_count > 0 ? (
                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-blue-900/50 text-blue-300 text-sm font-medium min-w-[2rem]">
                      {page.minor_count}
                    </span>
                  ) : (
                    <span className="text-gray-600 text-sm">—</span>
                  )}
                </td>
                <td className="py-4 text-right">
                  <span className="text-gray-900 font-semibold text-sm">
                    {formatNumber(page.total_violations)}
                  </span>
                </td>
                <td className="py-4 text-right">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length > 10 && (
        <div className="mt-4 text-center">
          <Link
            href="/dashboard/reports/pages"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-300 hover:bg-gray-700 rounded-lg transition-colors"
          >
            View all {data.length} sites
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

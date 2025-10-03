'use client'

import { useState, useEffect } from 'react'
import { Calendar, Filter, X } from 'lucide-react'
import type { TimeRange, Severity, ReportFilters } from '@/types/reports'

interface FilterBarProps {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
  sites: Array<{ id: string; name: string }>
}

const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '180d', label: 'Last 180 days' },
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'custom', label: 'Custom range' }
]

const severityOptions: Severity[] = ['critical', 'serious', 'moderate', 'minor']

export function FilterBar({ filters, onFiltersChange, sites }: FilterBarProps) {
  const [showCustomDates, setShowCustomDates] = useState(filters.timeRange === 'custom')

  useEffect(() => {
    setShowCustomDates(filters.timeRange === 'custom')
  }, [filters.timeRange])

  const handleTimeRangeChange = (timeRange: TimeRange) => {
    onFiltersChange({ ...filters, timeRange })
  }

  const handleSiteChange = (siteId: string) => {
    onFiltersChange({ ...filters, siteId: siteId || undefined })
  }

  const handleSeverityToggle = (severity: Severity) => {
    onFiltersChange({
      ...filters,
      severity: filters.severity === severity ? undefined : severity
    })
  }

  const handleStartDateChange = (startDate: string) => {
    onFiltersChange({ ...filters, startDate })
  }

  const handleEndDateChange = (endDate: string) => {
    onFiltersChange({ ...filters, endDate })
  }

  const clearFilters = () => {
    onFiltersChange({
      teamId: filters.teamId,
      timeRange: '30d'
    })
  }

  const hasActiveFilters = filters.siteId || filters.severity || filters.timeRange !== '30d'

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-300">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Time Range */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Time Range
          </label>
          <select
            value={filters.timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value as TimeRange)}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Site Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Site
          </label>
          <select
            value={filters.siteId || ''}
            onChange={(e) => handleSiteChange(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All sites</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Chips */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-gray-400 mb-2">
            Severity
          </label>
          <div className="flex flex-wrap gap-2">
            {severityOptions.map(severity => (
              <button
                key={severity}
                onClick={() => handleSeverityToggle(severity)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filters.severity === severity
                    ? severity === 'critical'
                      ? 'bg-red-600 text-white'
                      : severity === 'serious'
                      ? 'bg-orange-600 text-white'
                      : severity === 'moderate'
                      ? 'bg-amber-500 text-white'
                      : 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Date Range */}
      {showCustomDates && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <label className="text-xs font-medium text-gray-400">Custom Date Range</label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

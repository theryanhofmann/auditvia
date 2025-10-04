'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RotateCcw, ChevronDown, Calendar, Filter as FilterIcon } from 'lucide-react'
import { focusRing } from './design-tokens'
import type { ReportFilters, TimeRange, Severity } from '@/types/reports'

interface StickyFilterBarProps {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
  sites: Array<{ id: string; name: string }>
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
]

const SEVERITIES: { value: Severity; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-700' },
  { value: 'serious', label: 'Serious', color: 'bg-orange-100 text-orange-700' },
  { value: 'moderate', label: 'Moderate', color: 'bg-amber-100 text-amber-700' },
  { value: 'minor', label: 'Minor', color: 'bg-blue-100 text-blue-700' },
]

export function StickyFilterBar({ filters, onFiltersChange, sites }: StickyFilterBarProps) {
  const [showCustomDate, setShowCustomDate] = useState(false)

  const hasActiveFilters = filters.siteId || filters.severity

  const handleReset = () => {
    onFiltersChange({
      ...filters,
      timeRange: '30d',
      siteId: undefined,
      severity: undefined,
    })
    setShowCustomDate(false)
  }

  const selectedSite = sites.find(s => s.id === filters.siteId)
  const selectedTimeRange = TIME_RANGES.find(t => t.value === filters.timeRange)
  const selectedSeverity = SEVERITIES.find(s => s.value === filters.severity)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Time Range Dropdown */}
      <div className="relative group">
        <button
          className={`
            px-3.5 py-2
            bg-white hover:bg-gray-50
            border border-gray-300 hover:border-gray-400
            rounded-lg shadow-sm
            text-gray-700 font-medium text-sm
            flex items-center gap-2
            transition-colors
            ${focusRing}
          `}
          aria-label="Select time range"
        >
          <Calendar size={16} className="text-gray-500" />
          <span>{selectedTimeRange?.label}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {/* Dropdown Menu */}
        <div className="
          absolute top-full left-0 mt-1 w-56
          bg-white border border-gray-200 rounded-lg
          shadow-lg overflow-hidden
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-all duration-200
          z-50
        ">
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              onClick={() => {
                onFiltersChange({ ...filters, timeRange: range.value })
                if (range.value === 'custom') {
                  setShowCustomDate(true)
                } else {
                  setShowCustomDate(false)
                }
              }}
              className={`
                w-full px-4 py-2.5 text-left text-sm
                transition-colors
                ${filters.timeRange === range.value
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                }
                ${focusRing}
              `}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs */}
      <AnimatePresence>
        {showCustomDate && filters.timeRange === 'custom' && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2"
          >
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
              className={`
                px-3 py-2 rounded-lg text-sm
                bg-white border border-gray-300
                text-gray-700
                ${focusRing}
              `}
              aria-label="Start date"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
              className={`
                px-3 py-2 rounded-lg text-sm
                bg-white border border-gray-300
                text-gray-700
                ${focusRing}
              `}
              aria-label="End date"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Site Filter */}
      <div className="relative group">
        <button
          className={`
            px-3.5 py-2 rounded-lg shadow-sm text-sm
            ${filters.siteId 
              ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
              : 'bg-white border-gray-300 text-gray-700'
            }
            hover:bg-gray-50 hover:border-gray-400
            border font-medium
            flex items-center gap-2
            transition-colors
            ${focusRing}
          `}
          aria-label="Filter by site"
        >
          <FilterIcon size={16} className={filters.siteId ? 'text-blue-600' : 'text-gray-500'} />
          <span>{selectedSite?.name || 'All Sites'}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {/* Dropdown Menu */}
        <div className="
          absolute top-full left-0 mt-1 w-64
          bg-white border border-gray-200 rounded-lg
          shadow-lg overflow-hidden max-h-80 overflow-y-auto
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-all duration-200
          z-50
        ">
          <button
            onClick={() => onFiltersChange({ ...filters, siteId: undefined })}
            className={`
              w-full px-4 py-2.5 text-left text-sm
              transition-colors
              ${!filters.siteId
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
              }
              ${focusRing}
            `}
          >
            All Sites
          </button>
          {sites.map(site => (
            <button
              key={site.id}
              onClick={() => onFiltersChange({ ...filters, siteId: site.id })}
              className={`
                w-full px-4 py-2.5 text-left text-sm
                transition-colors truncate
                ${filters.siteId === site.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                }
                ${focusRing}
              `}
            >
              {site.name}
            </button>
          ))}
        </div>
      </div>

      {/* Severity Filter */}
      <div className="relative group">
        <button
          className={`
            px-3.5 py-2 rounded-lg shadow-sm text-sm
            ${filters.severity 
              ? 'bg-purple-50 border-purple-300 text-purple-700 font-medium'
              : 'bg-white border-gray-300 text-gray-700'
            }
            hover:bg-gray-50 hover:border-gray-400
            border font-medium
            flex items-center gap-2
            transition-colors
            ${focusRing}
          `}
          aria-label="Filter by severity"
        >
          <FilterIcon size={16} className={filters.severity ? 'text-purple-600' : 'text-gray-500'} />
          <span>{selectedSeverity?.label || 'All Severities'}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {/* Dropdown Menu */}
        <div className="
          absolute top-full left-0 mt-1 w-48
          bg-white border border-gray-200 rounded-lg
          shadow-lg overflow-hidden
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-all duration-200
          z-50
        ">
          <button
            onClick={() => onFiltersChange({ ...filters, severity: undefined })}
            className={`
              w-full px-4 py-2.5 text-left text-sm
              transition-colors
              ${!filters.severity
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
              }
              ${focusRing}
            `}
          >
            All Severities
          </button>
          {SEVERITIES.map(severity => (
            <button
              key={severity.value}
              onClick={() => onFiltersChange({ ...filters, severity: severity.value })}
              className={`
                w-full px-4 py-2.5 text-left text-sm
                transition-colors flex items-center gap-2
                ${filters.severity === severity.value
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
                }
                ${focusRing}
              `}
            >
              <span className={`w-2 h-2 rounded-full ${severity.color.includes('red') ? 'bg-red-500' : severity.color.includes('orange') ? 'bg-orange-500' : severity.color.includes('amber') ? 'bg-amber-500' : 'bg-blue-500'}`} />
              {severity.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={handleReset}
            className={`
              px-3.5 py-2 rounded-lg
              bg-white hover:bg-gray-50
              border border-gray-300 hover:border-gray-400
              text-gray-700 hover:text-gray-900
              font-medium text-sm
              flex items-center gap-2
              transition-all shadow-sm
              ${focusRing}
            `}
            aria-label="Reset filters"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Active Filters Breadcrumbs */}
      <AnimatePresence>
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2 ml-auto"
          >
            <span className="text-xs text-gray-500 font-medium">Active:</span>
            {filters.siteId && selectedSite && (
              <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium flex items-center gap-1.5">
                {selectedSite.name}
                <button
                  onClick={() => onFiltersChange({ ...filters, siteId: undefined })}
                  className="hover:text-blue-900 transition-colors"
                  aria-label="Remove site filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {filters.severity && selectedSeverity && (
              <span className={`px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-medium flex items-center gap-1.5`}>
                {selectedSeverity.label}
                <button
                  onClick={() => onFiltersChange({ ...filters, severity: undefined })}
                  className="hover:text-purple-900 transition-colors"
                  aria-label="Remove severity filter"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
/**
 * Utility functions for Reports Dashboard
 */

import type { TimeRange } from '@/types/reports'

/**
 * Convert TimeRange to start/end dates
 */
export function getDateRangeFromTimeRange(timeRange: TimeRange): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  
  switch (timeRange) {
    case '7d':
      start.setDate(end.getDate() - 7)
      break
    case '30d':
      start.setDate(end.getDate() - 30)
      break
    case '90d':
      start.setDate(end.getDate() - 90)
      break
    case '180d':
      start.setDate(end.getDate() - 180)
      break
    case 'month': {
      start.setDate(1) // First day of current month
      break
    }
    case 'quarter': {
      const currentMonth = end.getMonth()
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3
      start.setMonth(quarterStartMonth, 1)
      break
    }
    default:
      start.setDate(end.getDate() - 30) // Default to 30 days
  }
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  }
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Format currency
 */
export function formatCurrency(num: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num)
}

/**
 * Format percentage
 */
export function formatPercent(num: number, decimals: number = 1): string {
  return `${num.toFixed(decimals)}%`
}

/**
 * Calculate percentage change between two numbers
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Export data to CSV
 */
export function exportToCSV(data: any[], filename: string, columns: { key: string; label: string }[]) {
  // Build CSV header
  const header = columns.map(col => col.label).join(',')
  
  // Build CSV rows
  const rows = data.map(row => 
    columns.map(col => {
      const value = row[col.key]
      // Escape quotes and wrap in quotes if contains comma
      const stringValue = String(value ?? '')
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }).join(',')
  )
  
  const csv = [header, ...rows].join('\n')
  
  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return '#DC2626' // red-600
    case 'serious':
      return '#EA580C' // orange-600
    case 'moderate':
      return '#F59E0B' // amber-500
    case 'minor':
      return '#3B82F6' // blue-500
    default:
      return '#6B7280' // gray-500
  }
}

/**
 * Get chart colors for dark mode
 */
export const chartColors = {
  primary: '#3B82F6',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#06B6D4',
  grid: '#374151',
  text: '#9CA3AF',
  background: '#1F2937'
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

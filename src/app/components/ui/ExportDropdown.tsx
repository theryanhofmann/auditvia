'use client'

import { useState } from 'react'
import { Download, FileText, Table } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { toast } from 'sonner'

interface ExportDropdownProps {
  scanId: string
  hasIssues: boolean
  disabled?: boolean
  className?: string
}

export function ExportDropdown({ 
  scanId, 
  hasIssues, 
  disabled = false,
  className = '' 
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'md' | 'csv') => {
    setIsOpen(false)
    setIsExporting(true)
    
    const toastId = toast.loading('Preparing export...')
    
    try {
      console.log(`📤 [export-ui] Starting ${format.toUpperCase()} export for scan: ${scanId}`)
      
      const response = await fetch(`/api/scans/${scanId}/export?format=${format}`)
      
      console.log(`📤 [export-ui] Response status: ${response.status}`)
      
      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Export failed'
        try {
          const data = await response.json()
          console.error(`📤 [export-ui] Error response:`, data)
          errorMessage = data.error || errorMessage
        } catch (parseError) {
          console.error(`📤 [export-ui] Could not parse error response:`, parseError)
          errorMessage = `Export failed (${response.status} ${response.statusText})`
        }
        throw new Error(errorMessage)
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch?.[1] || `scan-report-${scanId}.${format}`
      
      console.log(`📤 [export-ui] Downloading file: ${filename}`)
      
      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      console.log(`📤 [export-ui] Export successful`)
      toast.success('Issues exported', { id: toastId })
    } catch (error) {
      console.error('📤 [export-ui] Export failed:', error)
      
      // Get a safe error message
      let errorMessage = 'Failed to export issues'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast.error(errorMessage, { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  const isDisabled = disabled || !hasIssues || isExporting

  return (
    <div className={cn('relative inline-block text-left', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900',
          isDisabled
            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
        )}
        title={
          !hasIssues 
            ? 'No issues to export' 
            : disabled 
            ? 'Available after scan completes'
            : 'Export scan results'
        }
      >
        <Download className="w-4 h-4 mr-2" />
        Export
        <svg 
          className={cn('w-4 h-4 ml-2 transition-transform', isOpen && 'rotate-180')} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !isDisabled && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
            <div className="py-1" role="menu">
              <button
                onClick={() => handleExport('md')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                role="menuitem"
              >
                <FileText className="w-4 h-4 mr-3 text-gray-500" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Markdown</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Readable format (.md)
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                role="menuitem"
              >
                <Table className="w-4 h-4 mr-3 text-gray-500" />
                <div className="flex-1 text-left">
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Spreadsheet format (.csv)
                  </div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

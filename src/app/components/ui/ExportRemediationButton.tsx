'use client'

import { useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { exportRemediationGuide } from '@/lib/export-remediation'
import { toast } from 'sonner'

interface Issue {
  id: string
  rule: string
  description: string
  impact: string
  selector: string
  html?: string | null
  help_url?: string | null
}

interface ExportRemediationButtonProps {
  issues: Issue[]
  scanId: string
  siteUrl: string
  siteName: string
  scanDate: string
  score: number
  variant?: 'default' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export function ExportRemediationButton({
  issues,
  scanId,
  siteUrl,
  siteName,
  scanDate,
  score,
  variant = 'default',
  size = 'md'
}: ExportRemediationButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (issues.length === 0) {
      toast.error('No issues to export')
      return
    }

    setIsExporting(true)
    try {
      exportRemediationGuide(issues, {
        scanId,
        siteUrl,
        siteName,
        scanDate,
        score,
        totalIssues: issues.length
      })
      
      toast.success('Remediation guide exported successfully!')
    } catch (error) {
      console.error('Failed to export remediation guide:', error)
      toast.error('Failed to export remediation guide')
    } finally {
      setIsExporting(false)
    }
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
    outline: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || issues.length === 0}
      className={cn(
        'inline-flex items-center font-medium rounded-lg transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant]
      )}
      title={issues.length === 0 ? 'No issues to export' : 'Export all remediation guidance as Markdown'}
    >
      {isExporting ? (
        <>
          <Download className={cn('animate-bounce', size === 'sm' ? 'w-4 h-4 mr-2' : 'w-5 h-5 mr-2')} />
          Exporting...
        </>
      ) : (
        <>
          <FileText className={cn(size === 'sm' ? 'w-4 h-4 mr-2' : 'w-5 h-5 mr-2')} />
          Export Fixes
        </>
      )}
    </button>
  )
}

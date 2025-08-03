import { Download, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export interface UpgradeCTAProps {
  onExport: () => void
  disabled?: boolean
}

export function UpgradeCTA({ onExport, disabled }: UpgradeCTAProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Want to Fix These Issues?
          </h2>
          <p className="mt-1 text-blue-700 dark:text-blue-300">
            Upgrade to Pro for detailed reports and automated monitoring.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onExport}
            disabled={disabled}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <span>Upgrade to Pro</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
} 
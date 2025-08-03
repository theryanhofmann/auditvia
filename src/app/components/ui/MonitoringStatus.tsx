import { Activity } from 'lucide-react'
import { cn } from '@/app/lib/utils'

interface MonitoringStatusProps {
  monitoringEnabled: boolean
  lastScannedAt: string
  className?: string
}

export function MonitoringStatus({ 
  monitoringEnabled, 
  lastScannedAt,
  className 
}: MonitoringStatusProps) {
  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden",
      className
    )}>
      <div className="p-6">
        <div className="flex items-start space-x-4">
          <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h2 className="text-base font-medium text-gray-900 dark:text-white">
                Monitoring Status
              </h2>
              <div className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                monitoringEnabled
                  ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-900/50"
                  : "bg-gray-50 text-red-700 border-gray-200 dark:bg-gray-900/20 dark:text-red-300 dark:border-gray-800"
              )}>
                <span className="relative flex items-center">
                  {monitoringEnabled && (
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 dark:bg-green-500" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 dark:bg-green-400" />
                    </span>
                  )}
                  {monitoringEnabled ? 'Monitoring Active' : 'Monitoring Disabled'}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Last scanned: {new Date(lastScannedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 
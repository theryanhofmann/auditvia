import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/app/lib/utils'

interface Scan {
  id: string
  created_at: string
  total_violations: number | null
  status: 'completed' | 'running' | 'failed'
}

interface ScanHistoryProps {
  siteId: string
  className?: string
}

export function ScanHistory({ siteId, className }: ScanHistoryProps) {
  const router = useRouter()
  const [scans, setScans] = useState<Scan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchScans = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch(`/api/sites/${siteId}/scans?limit=5`)
        if (!response.ok) {
          throw new Error('Failed to fetch scan history')
        }

        const data = await response.json()
        setScans(data.scans || [])
      } catch (err) {
        console.error('Error fetching scans:', err)
        setError(err instanceof Error ? err.message : 'Failed to load scan history')
      } finally {
        setIsLoading(false)
      }
    }

    fetchScans()
  }, [siteId])

  const getComplianceStatus = (violations: number | null) => {
    if (violations === null) return { text: 'Unknown', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
    if (violations === 0) return { text: 'Fully Compliant', color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' }
    if (violations <= 5) return { text: 'Partially Compliant', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' }
    return { text: 'Non-Compliant', color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' }
  }

  if (isLoading) {
    return (
      <div className={cn("flex justify-center py-4", className)}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("text-sm text-red-600 dark:text-red-400 py-2", className)}>
        {error}
      </div>
    )
  }

  if (scans.length === 0) {
    return (
      <div className={cn("text-sm text-gray-500 dark:text-gray-400 py-2 text-center", className)}>
        No scans found
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Recent Scans
      </h4>
      <div className="flex flex-wrap gap-2">
        {scans.map((scan) => {
          const compliance = getComplianceStatus(scan.total_violations)
          const date = new Date(scan.created_at)
          const formattedDate = date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })

          return (
            <button
              key={scan.id}
              onClick={() => router.push(`/dashboard/scans/${scan.id}`)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
                "transition-colors duration-200",
                "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                "dark:focus:ring-offset-gray-900",
                scan.status === 'running' ? 'animate-pulse' : '',
                compliance.color
              )}
            >
              {formattedDate}
              {scan.total_violations !== null && (
                <span className="opacity-75">
                  ({scan.total_violations} issues)
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
} 
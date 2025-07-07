import { Site } from '@/app/types/dashboard'
import { format } from 'date-fns'
import { 
  Play, 
  Eye, 
  Trash2, 
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react'
import { Switch } from '@/app/components/ui/switch'

interface SitesTableProps {
  sites: Site[]
  onRunScan: (siteId: string) => Promise<void>
  onToggleMonitoring: (siteId: string, enabled: boolean) => Promise<void>
  onDeleteSite: (siteId: string) => void
  isScanning?: string | null // Track which site is currently scanning
}

export function SitesTable({ sites, onRunScan, onToggleMonitoring, onDeleteSite, isScanning }: SitesTableProps) {
  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'text-gray-500'
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'bg-gray-50 dark:bg-gray-900'
    if (score >= 90) return 'bg-green-50 dark:bg-green-900/20'
    if (score >= 70) return 'bg-blue-50 dark:bg-blue-900/20'
    if (score >= 50) return 'bg-yellow-50 dark:bg-yellow-900/20'
    return 'bg-red-50 dark:bg-red-900/20'
  }

  const getStatusIcon = (status: string | null | undefined, siteId: string) => {
    // Show scanning if this specific site is being scanned
    if (isScanning === siteId || status === 'scanning') {
      return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
    }
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: string | null | undefined, siteId: string) => {
    // Show scanning if this specific site is being scanned
    if (isScanning === siteId || status === 'scanning') {
      return 'Scanning...'
    }
    
    switch (status) {
      case 'completed':
        return 'Completed'
      case 'error':
        return 'Error'
      case 'queued':
        return 'Queued'
      default:
        return 'Ready to scan'
    }
  }

  if (sites.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No sites added yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Add your first website to start monitoring accessibility
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Website
            </th>
            <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Score
            </th>
            <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Last Scan
            </th>
            <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Monitoring
            </th>
            <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {sites.map((site) => (
            <tr key={site.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="py-4 px-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {site.name ? site.name.charAt(0).toUpperCase() : site.url.charAt(8).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {site.name || new URL(site.url).hostname}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                      <span className="truncate max-w-xs">{site.url}</span>
                      <a
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 hover:text-blue-600 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="flex items-center space-x-2">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreBg(site.score)}`}>
                    <span className={getScoreColor(site.score)}>
                      {site.score !== null && site.score !== undefined ? `${site.score}/100` : 'Not scanned'}
                    </span>
                  </div>
                  {site.score !== null && site.score !== undefined && site.score < 100 && (
                    <div className="flex items-center text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      <span>Issues found</span>
                    </div>
                  )}
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="flex items-center">
                  {getStatusIcon(site.status, site.id)}
                  <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                    {getStatusText(site.status, site.id)}
                  </span>
                </div>
              </td>
              <td className="py-4 px-6">
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  {site.last_scan ? format(new Date(site.last_scan), 'MMM dd, yyyy') : 'Never'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {site.last_scan ? format(new Date(site.last_scan), 'hh:mm a') : ''}
                </div>
              </td>
              <td className="py-4 px-6">
                <Switch
                  checked={site.monitoring}
                  onCheckedChange={(checked) => onToggleMonitoring(site.id, checked)}
                />
              </td>
              <td className="py-4 px-6">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onRunScan(site.id)}
                    disabled={isScanning === site.id || site.status === 'scanning'}
                    className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={
                      isScanning === site.id ? "Scanning in progress..." : 
                      site.status === 'scanning' ? "Scan in progress..." :
                      "Run accessibility scan"
                    }
                  >
                    {isScanning === site.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  
                  {site.latest_audit_result_id && (
                    <button
                      onClick={() => window.open(`/sites/${site.id}/report/${site.latest_audit_result_id}`, '_blank')}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View report"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this site?')) {
                        onDeleteSite(site.id)
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Delete site"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 
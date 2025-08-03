import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreVertical, X } from 'lucide-react'
import { Switch } from './switch'
import { cn } from '@/app/lib/utils'
import toast from 'react-hot-toast'

interface SiteSettingsDrawerProps {
  siteId: string
  siteName: string
  isMonitoringEnabled: boolean
  onClose: () => void
  onSiteDeleted?: () => void
  className?: string
}

export function SiteSettingsDrawer({
  siteId,
  siteName,
  isMonitoringEnabled: initialMonitoringState,
  onClose,
  onSiteDeleted,
  className
}: SiteSettingsDrawerProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isTogglingMonitoring, setIsTogglingMonitoring] = useState(false)
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(initialMonitoringState)

  const handleClose = () => {
    setIsOpen(false)
    setTimeout(onClose, 300) // Wait for animation
  }

  const toggleMonitoring = async () => {
    if (isTogglingMonitoring) return

    try {
      setIsTogglingMonitoring(true)
      const response = await fetch(`/api/sites/${siteId}/monitoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: !isMonitoringEnabled
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update monitoring settings')
      }

      setIsMonitoringEnabled(!isMonitoringEnabled)
      toast.success(`Monitoring ${!isMonitoringEnabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Error toggling monitoring:', error)
      toast.error('Failed to update monitoring settings')
    } finally {
      setIsTogglingMonitoring(false)
    }
  }

  const deleteSite = async () => {
    if (isDeleting) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete site')
      }

      toast.success('Site deleted successfully')
      onSiteDeleted?.()
      
      // If we're on the site's page, redirect to dashboard
      if (window.location.pathname.includes(`/sites/${siteId}`)) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error deleting site:', error)
      toast.error('Failed to delete site')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
        aria-label="Site settings"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {/* Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800",
          "transform transition-transform duration-300 ease-in-out z-50",
          "border-l border-gray-200 dark:border-gray-700",
          isOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Site settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Site Settings
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Monitoring Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Automatic Monitoring
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Automatically run a scan every week.
                </p>
              </div>
              <Switch
                checked={isMonitoringEnabled}
                onCheckedChange={toggleMonitoring}
                disabled={isTogglingMonitoring}
              />
            </div>
          </div>

          {/* Delete Site */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Danger Zone
            </h3>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete Site
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete {siteName}? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={deleteSite}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg transition-colors"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
} 
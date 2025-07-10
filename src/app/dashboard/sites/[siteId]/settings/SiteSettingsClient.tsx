'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  Save, 
  Trash2, 
  AlertTriangle, 
  Monitor,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'

interface Site {
  id: string
  name: string | null
  url: string
  user_id: string | null
  monitoring: boolean | null
  custom_domain: string | null
  created_at: string
  updated_at: string
}

interface SiteSettingsClientProps {
  site: Site
}

export function SiteSettingsClient({ site }: SiteSettingsClientProps) {
  const router = useRouter()
  const [siteName, setSiteName] = useState(site.name || '')
  const [customDomain, setCustomDomain] = useState(site.custom_domain || '')
  const [monitoring, setMonitoring] = useState(site.monitoring || false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [customDomainError, setCustomDomainError] = useState('')

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  const validateCustomDomain = (domain: string): boolean => {
    setCustomDomainError('')
    
    if (!domain.trim()) {
      return true // Custom domain is optional
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!domainRegex.test(domain.trim())) {
      setCustomDomainError('Please enter a valid domain (e.g., app.example.com)')
      return false
    }

    // Check if domain doesn't start with http:// or https://
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      setCustomDomainError('Enter domain only, without http:// or https://')
      return false
    }

    return true
  }

  const handleUpdateSite = async () => {
    if (!validateCustomDomain(customDomain)) {
      return
    }

    try {
      setIsUpdating(true)

      const response = await fetch(`/api/sites/${site.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: siteName.trim() || null,
          custom_domain: customDomain.trim() || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update site')
      }

      showToast('success', 'Site updated successfully!')
      router.refresh()
    } catch (error) {
      console.error('Error updating site:', error)
      showToast('error', 'Failed to update site. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleToggleMonitoring = async () => {
    try {
      const newMonitoringState = !monitoring

      const response = await fetch(`/api/sites/${site.id}/monitoring`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: newMonitoringState,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update monitoring')
      }

      setMonitoring(newMonitoringState)
      showToast('success', `Monitoring ${newMonitoringState ? 'enabled' : 'disabled'} successfully!`)
      router.refresh()
    } catch (error) {
      console.error('Error updating monitoring:', error)
      showToast('error', 'Failed to update monitoring. Please try again.')
    }
  }

  const handleDeleteSite = async () => {
    try {
      setIsDeleting(true);

      const response = await fetch(`/api/sites/${site.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete site');
      }

      showToast('success', 'Site deleted successfully!');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Error deleting site:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to delete site. Please try again.');
      setIsDeleting(false);
    }
  };

  const hostname = new URL(site.url).hostname
  const displayDomain = site.custom_domain || hostname

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Back Link */}
      <div>
        <Link
          href={`/dashboard/sites/${site.id}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Scan History
        </Link>
      </div>

      {/* Site Information */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Site Information
          </h2>
        </div>

        <div className="space-y-6">
          {/* Site Name */}
          <div>
            <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site Name
            </label>
            <input
              type="text"
              id="siteName"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder={displayDomain}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty to use the display domain ({displayDomain})
            </p>
          </div>

          {/* Custom Domain */}
          <div>
            <label htmlFor="customDomain" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Custom Domain
            </label>
            <input
              type="text"
              id="customDomain"
              value={customDomain}
              onChange={(e) => {
                setCustomDomain(e.target.value)
                if (customDomainError) setCustomDomainError('')
              }}
              placeholder="app.example.com"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors
                ${customDomainError 
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500' 
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
            />
            {customDomainError && (
              <div className="flex items-center space-x-2 mt-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{customDomainError}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Alternative domain to scan instead of the main URL. Scans will use https://{customDomain || 'custom-domain.com'}
            </p>
          </div>

          {/* Site URL (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Website URL
            </label>
            <div className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              {site.url}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              URL cannot be changed after site creation
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleUpdateSite}
              disabled={isUpdating}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monitoring Settings */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Automated Monitoring
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Enable Automated Scans
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Automatically scan this site every 6 hours for accessibility issues
                {site.custom_domain && (
                  <span className="block text-blue-600 dark:text-blue-400 mt-1">
                    Scans will use: https://{site.custom_domain}
                  </span>
                )}
              </p>
            </div>
            
            <button
              onClick={handleToggleMonitoring}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                monitoring
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  monitoring ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {monitoring && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Monitoring Active
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                    This site will be automatically scanned every 6 hours. You'll receive notifications if accessibility issues are detected.
                    {site.custom_domain && (
                      <span className="block mt-1">
                        Monitoring URL: https://{site.custom_domain}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-800 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
            Danger Zone
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Delete Site
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Permanently delete this site and all associated scan data. This action cannot be undone.
            </p>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Site</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Delete Site
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-3">
                Are you sure you want to delete <strong>{siteName || displayDomain}</strong>?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                This will permanently delete all scan data and cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSite}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Site'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
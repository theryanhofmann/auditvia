'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useTeam } from '@/app/context/TeamContext'
import { 
  Save, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Lock
} from 'lucide-react'
import { ProBadge } from '@/app/components/ui/ProBadge'
import { RepositorySettings } from './RepositorySettings'
import { ScanProfileSelector } from '@/app/components/settings/ScanProfileSelector'

interface Site {
  id: string
  name: string | null
  url: string
  team_id: string
  monitoring: boolean | null
  custom_domain: string | null
  created_at: string
  updated_at: string
  github_repo?: string | null
  repository_mode?: 'issue_only' | 'pr' | null
  default_scan_profile?: 'quick' | 'standard' | 'deep' | null
}

interface SiteSettingsClientProps {
  site: Site
}

export function SiteSettingsClient({ site }: SiteSettingsClientProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { teamId } = useTeam()
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
    // teamId validation now handled server-side

    if (!validateCustomDomain(customDomain)) {
      return
    }

    try {
      setIsUpdating(true)

      const response = await fetch(`/api/sites/${site.id}?teamId=${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: siteName.trim() || null,
          custom_domain: customDomain.trim() || null,
          teamId
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
    // teamId validation now handled server-side

    if (!session?.user.pro) {
      showToast('error', 'Upgrade to Pro to enable monitoring')
      router.push('/settings')
      return
    }

    try {
      const newMonitoringState = !monitoring

      const response = await fetch(`/api/sites/${site.id}/monitoring?teamId=${teamId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: newMonitoringState,
        }),
      })

      if (!response.ok) {
        if (response.status === 403) {
          showToast('error', 'Upgrade to Pro to enable monitoring')
          router.push('/settings')
          return
        }
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
    // teamId validation now handled server-side

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/sites/${site.id}?teamId=${teamId}`, {
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

  // Verify team ownership
  if (teamId !== site.team_id) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <Lock className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-semibold text-gray-900">
          Access Denied
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          You do not have access to this site's settings
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Site Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Site Information
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Update your site's display name and scanning configuration
          </p>
        </div>

        <div className="space-y-6">
          {/* Site Name */}
          <div>
            <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 mb-2">
              Site Name
            </label>
            <input
              type="text"
              id="siteName"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder={displayDomain}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use the display domain ({displayDomain})
            </p>
          </div>

          {/* Custom Domain */}
          <div>
            <label htmlFor="customDomain" className="block text-sm font-medium text-gray-700 mb-2">
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
              className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 focus:ring-2 focus:border-transparent transition-colors ${
                customDomainError 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {customDomainError && (
              <div className="flex items-center space-x-2 mt-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{customDomainError}</span>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Alternative domain to scan instead of the main URL. Scans will use https://{customDomain || 'custom-domain.com'}
            </p>
          </div>

          {/* Site URL (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
              {site.url}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              URL cannot be changed after site creation
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleUpdateSite}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Repository Settings */}
      <RepositorySettings
        siteId={site.id}
        initialRepo={site.github_repo}
        initialMode={site.repository_mode}
      />

      {/* Scan Profile Settings */}
      <ScanProfileSelector
        siteId={site.id}
        currentProfile={(site as any).default_scan_profile || 'deep'}
      />

      {/* Monitoring Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Automated Monitoring
            </h2>
            {!session?.user.pro && <ProBadge />}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Automatically scan this site every 6 hours to catch accessibility issues early
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900">
                Enable Automated Scans
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Run accessibility scans every 6 hours
                {site.custom_domain && (
                  <span className="block text-blue-600 mt-1">
                    Scans will use: https://{site.custom_domain}
                  </span>
                )}
              </p>
              {!session?.user.pro && (
                <p className="text-xs text-gray-500 mt-2">
                  Requires Pro plan
                </p>
              )}
            </div>
            
            <button
              onClick={handleToggleMonitoring}
              disabled={!session?.user.pro}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                monitoring
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-200 hover:bg-gray-300'
              } ${!session?.user.pro ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  monitoring ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {monitoring && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">
                    Monitoring Active
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
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
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">
              Danger Zone
            </h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Irreversible and destructive actions
          </p>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-red-900">
                Delete This Site
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Permanently remove this site and all scan history. This action cannot be undone.
              </p>
            </div>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Site'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Site
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-gray-700">
                Are you sure you want to delete <strong className="text-gray-900">{siteName || displayDomain}</strong>?
              </p>
              <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  This will permanently delete all scan history, reports, and configuration for this site.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSite}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
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
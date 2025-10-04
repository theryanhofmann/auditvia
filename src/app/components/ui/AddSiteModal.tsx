'use client'

import { useState } from 'react'
import { X,  AlertCircle } from 'lucide-react'
import { useSession, signIn } from 'next-auth/react'
import { useTeam } from '@/app/context/TeamContext'
import toast from 'react-hot-toast'

interface AddSiteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddSiteModal({ isOpen, onClose, onSuccess }: AddSiteModalProps) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<'idle' | 'creating' | 'scanning'>('idle')
  const [urlError, setUrlError] = useState('')
  const [customDomainError, setCustomDomainError] = useState('')
  const { data: _session, status } = useSession()
  const { teamId: _teamId, loading: teamLoading } = useTeam()

  const validateUrl = (inputUrl: string): boolean => {
    setUrlError('')
    
    if (!inputUrl.trim()) {
      setUrlError('URL is required')
      return false
    }

    // Check if URL starts with https://
    if (!inputUrl.startsWith('https://')) {
      setUrlError('URL must start with https://')
      return false
    }

    // Basic URL validation
    try {
      const urlObj = new URL(inputUrl)
      if (!urlObj.hostname) {
        setUrlError('Please enter a valid URL')
        return false
      }
    } catch {
      setUrlError('Please enter a valid URL')
      return false
    }

    return true
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check authentication
    if (status === 'unauthenticated') {
      toast.error('Please sign in to add a site')
      signIn()
      return
    }

    // Note: teamId is now handled server-side for reliability

    // Validate inputs
    if (!validateUrl(url) || !validateCustomDomain(customDomain)) {
      return
    }

    if (!name.trim()) {
      toast.error('Please enter a site name')
      return
    }

    if (isSubmitting) return
    setIsSubmitting(true)
    setCurrentOperation('creating')

    try {
      // Step 1: Create the site
      const siteResponse = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // Ensure cookies are sent
        body: JSON.stringify({
          url: url.trim(),
          name: name.trim(),
          custom_domain: customDomain.trim() || null
          // teamId derived server-side via getCurrentTeamId()
        }),
      })

      const responseData = await siteResponse.json()

      if (!siteResponse.ok) {
        // Handle specific status codes
        if (siteResponse.status === 401) {
          toast.error('Authentication error. Please sign out and sign in again.')
          signIn()
          return
        } else if (siteResponse.status === 400) {
          if (responseData.error === 'Site already exists') {
            setUrlError('You have already added this site')
            return
          }
          toast.error(responseData.error || 'Invalid request. Please check your input.')
          return
        } else if (siteResponse.status === 403) {
          toast.error(responseData.error || 'Permission denied.')
          return
        } else {
          // 500 or other errors - show the specific error message
          toast.error(responseData.error || 'Failed to add site. Please try again.')
          return
        }
      }

      // Site was created successfully
      console.log('Site creation successful, response data:', responseData)
      toast.success('Site added successfully! Starting initial scan...')

      // Step 2: Create an initial scan for the new site
      setCurrentOperation('scanning')
      
      // Validate we have the required data from site creation
      if (!responseData.site?.id) {
        console.error('Site creation response missing site.id. Full response:', responseData)
        console.error('Expected structure: { site: { id: string, ... } }')
        toast.success('Site added! You can run a scan manually from the dashboard.')
        resetForm()
        onClose()
        onSuccess?.()
        return
      }
      
      try {
        const auditPayload = {
          url: url.trim(),
          siteId: responseData.site.id
        }
        
        console.log('Creating initial scan with payload:', auditPayload)
        console.log('Site created successfully with ID:', responseData.site.id)
        
        const auditResponse = await fetch('/api/audit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'same-origin', // Ensure session cookies are sent
          body: JSON.stringify(auditPayload),
        })

        // Parse response safely
        let auditData
        try {
          auditData = await auditResponse.json()
        } catch (parseError) {
          console.error('Failed to parse scan API response:', parseError)
          auditData = { error: { message: 'Invalid response from server' } }
        }

        console.log('Audit API response:', auditData)

        if (auditResponse.ok && auditData.success && auditData.scanId) {
          // Scan was created successfully, navigate to the running scan page
          toast.success('Site added! Scan is starting...')
          window.location.href = `/dashboard/scans/${auditData.scanId}`
          return // Exit early to prevent form reset and modal close
        } else {
          // Scan API failed or returned success but no scanId
          const errorMessage = auditData?.error?.message || 'Failed to start initial scan'
          const errorCode = auditData?.error?.code || 'unknown_error'

          console.error('Initial scan failed:', {
            status: auditResponse.status,
            statusText: auditResponse.statusText,
            errorCode,
            errorMessage,
            payload: auditPayload
          })

          // Show specific error messages for different error types
          if (errorCode === 'playwright_missing') {
            toast.error('Browser not available. Site added! You can run a scan manually from the dashboard.')
          } else if (errorCode === 'rate_limit') {
            toast.error('Too many recent scans. Site added! You can run a scan manually from the dashboard.')
          } else if (errorCode === 'authentication_error') {
            toast.error('Please sign in to run scans. Site added! You can run a scan manually from the dashboard.')
          } else if (errorCode === 'authorization_error') {
            toast.error('You don\'t have permission to scan this site. Site added! You can run a scan manually from the dashboard.')
          } else if (errorCode === 'validation_error') {
            toast.error('Invalid scan request. Site added! You can run a scan manually from the dashboard.')
          } else if (errorCode === 'database_error') {
            toast.error('Server error. Site added! You can run a scan manually from the dashboard.')
          } else {
            toast.error(`Site added! Scan failed: ${errorMessage}`)
          }
        }
      } catch (scanError) {
        // Network or other error during scan creation
        console.error('Initial scan network error:', scanError)
        toast.success('Site added! You can manually run a scan from the dashboard.')
      }

      resetForm()
      onClose()
      onSuccess?.()
    } catch (error) {
      console.error('Error adding site:', error)
      toast.error('Failed to connect to server. Please try again.')
    } finally {
      setIsSubmitting(false)
      setCurrentOperation('idle')
    }
  }

  const resetForm = () => {
    setUrl('')
    setName('')
    setCustomDomain('')
    setUrlError('')
    setCustomDomainError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Add New Site
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Start monitoring accessibility for your website
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="space-y-5">
            {/* Site Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Site Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Website"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={isSubmitting}
              />
            </div>

            {/* Site URL */}
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Site URL
              </label>
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:border-transparent transition-colors ${
                  urlError
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                disabled={isSubmitting}
              />
              {urlError && (
                <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{urlError}</span>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Must start with https://
              </p>
            </div>

            {/* Custom Domain (Optional) */}
            <div>
              <label
                htmlFor="customDomain"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Custom Domain <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                id="customDomain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="app.example.com"
                className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:border-transparent transition-colors ${
                  customDomainError
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                disabled={isSubmitting}
              />
              {customDomainError && (
                <div className="mt-2 flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{customDomainError}</span>
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                For scanning behind a custom domain or proxy
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || teamLoading}
              className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                isSubmitting || teamLoading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {teamLoading
                ? 'Loading...'
                : isSubmitting
                ? currentOperation === 'creating'
                  ? 'Adding Site...'
                  : 'Starting Scan...'
                : 'Add Site'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 

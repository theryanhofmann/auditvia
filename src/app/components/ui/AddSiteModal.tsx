'use client'

import { useState } from 'react'
import { X, Globe, AlertCircle } from 'lucide-react'
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
  const { data: session, status } = useSession()
  const { teamId, loading: teamLoading } = useTeam()

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

        if (auditResponse.ok) {
          const auditData = await auditResponse.json()
          console.log('Audit API response:', auditData)
          
          if (auditData.success && auditData.scanId) {
            // Scan was created successfully, navigate to the running scan page
            toast.success('Site added! Scan is starting...')
            window.location.href = `/dashboard/reports/${auditData.scanId}`
            return // Exit early to prevent form reset and modal close
          } else {
            // API returned success but no scanId
            console.warn('Scan API returned success but no scanId:', auditData)
            toast.success('Site added! You can run a scan manually from the dashboard.')
          }
        } else {
          // Scan API failed
          const errorData = await auditResponse.json().catch(() => ({}))
          console.error('Initial scan failed:', {
            status: auditResponse.status,
            statusText: auditResponse.statusText,
            errorData,
            payload: auditPayload
          })
          
          if (auditResponse.status === 400) {
            console.error('400 error - likely missing required fields. Payload was:', auditPayload)
          }
          
          toast.success('Site added! You can run a scan manually from the dashboard.')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center mb-6">
          <Globe className="w-6 h-6 text-blue-500 dark:text-blue-400 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add New Site
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Site Name */}
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Site Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Website"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Site URL */}
          <div className="mb-4">
            <label
              htmlFor="url"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Site URL
            </label>
            <input
              type="text"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                urlError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {urlError && (
              <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mr-1" />
                {urlError}
              </div>
            )}
          </div>

          {/* Custom Domain (Optional) */}
          <div className="mb-6">
            <label
              htmlFor="customDomain"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Custom Domain (Optional)
            </label>
            <input
              type="text"
              id="customDomain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="app.example.com"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                customDomainError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {customDomainError && (
              <div className="mt-1 flex items-center text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mr-1" />
                {customDomainError}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || teamLoading}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              isSubmitting || teamLoading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } transition-colors`}
          >
            {teamLoading
              ? 'Loading...'
              : isSubmitting
              ? currentOperation === 'creating'
                ? 'Adding Site...'
                : 'Starting Scan...'
              : 'Add Site'}
          </button>
        </form>
      </div>
    </div>
  )
} 
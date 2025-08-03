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
  const { teamId } = useTeam()

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

    // Check team selection
    if (!teamId) {
      toast.error('Please select a team first')
      return
    }

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
        body: JSON.stringify({
          url: url.trim(),
          name: name.trim(),
          custom_domain: customDomain.trim() || null,
          teamId
        }),
      })

      const responseData = await siteResponse.json()

      if (!siteResponse.ok) {
        if (responseData.error === 'Site already exists') {
          setUrlError('You have already added this site')
          return
        }

        if (responseData.error === 'Not authenticated') {
          toast.error('Please sign in to add a site')
          signIn()
          return
        }

        toast.error(responseData.error || 'Failed to add site')
        return
      }

      // Site was created successfully
      toast.success('Site added successfully! Starting initial scan...')

      // Step 2: Create an initial scan for the new site
      setCurrentOperation('scanning')
      try {
        const auditResponse = await fetch('/api/audit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url.trim(),
            siteId: responseData.id,
            teamId
          }),
        })

        if (auditResponse.ok) {
          const auditData = await auditResponse.json()
          if (auditData.success) {
            const scanId = auditData.data?.scan?.id
            if (scanId) {
              toast.success('Initial scan completed!')
              window.location.href = `/dashboard/reports/${scanId}`
            } else {
              toast.success('Site added! Scan will begin shortly.')
            }
          } else {
            toast.success('Site added! Scan will begin shortly.')
          }
        } else {
          // Don't fail the whole operation if scan fails
          console.warn('Initial scan failed, but site was created successfully')
          toast.success('Site added! You can run a scan manually from the dashboard.')
        }
      } catch (scanError) {
        // Don't fail the whole operation if scan fails
        console.warn('Initial scan failed:', scanError)
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
            disabled={isSubmitting}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              isSubmitting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } transition-colors`}
          >
            {isSubmitting
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
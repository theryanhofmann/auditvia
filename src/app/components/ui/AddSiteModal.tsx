'use client'

import { useState } from 'react'
import { X, Globe, AlertCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface AddSiteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddSiteModal({ isOpen, onClose, onSuccess }: AddSiteModalProps) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [urlError, setUrlError] = useState('')
  const { data: session } = useSession()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!session?.user) {
      toast.error('Please sign in to add sites')
      return
    }

    if (!validateUrl(url)) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          name: name.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 409) {
          setUrlError('You have already added this site')
          return
        }
        throw new Error(errorData.error || 'Failed to add site')
      }

      toast.success('Site added successfully!')
      resetForm()
      onClose()
      onSuccess?.()
    } catch (error) {
      console.error('Error adding site:', error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error('Failed to add site')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setUrl('')
    setName('')
    setUrlError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Add New Site
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Add a website to monitor for accessibility
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* URL Input */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Website URL *
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  if (urlError) setUrlError('')
                }}
                placeholder="https://example.com"
                className={`w-full px-3 py-2 border rounded-lg text-sm
                  ${urlError 
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500' 
                    : 'border-zinc-300 dark:border-zinc-600 focus:border-blue-500 focus:ring-blue-500'
                  }
                  bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                  placeholder-zinc-500 dark:placeholder-zinc-400
                  focus:outline-none focus:ring-2 focus:ring-opacity-20
                `}
                required
              />
              {urlError && (
                <div className="flex items-center space-x-2 mt-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{urlError}</span>
                </div>
              )}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Must start with https:// for security
              </p>
            </div>

            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Site Name (optional)
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Website"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm
                  bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                  placeholder-zinc-500 dark:placeholder-zinc-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:border-blue-500"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                A friendly name to identify your site
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 
                  hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !url.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 
                  disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors
                  flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Add Site</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 
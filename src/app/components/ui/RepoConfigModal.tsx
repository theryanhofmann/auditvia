'use client'

import { useState } from 'react'
import { X, Github, AlertCircle } from 'lucide-react'
import { cn } from '@/app/lib/utils'

interface RepoConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (repo: string) => Promise<void>
  siteName: string
  currentRepo?: string
}

export function RepoConfigModal({
  isOpen,
  onClose,
  onSave,
  siteName,
  currentRepo = ''
}: RepoConfigModalProps) {
  const [repo, setRepo] = useState(currentRepo)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const validateRepoFormat = (value: string): boolean => {
    const repoRegex = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/
    return repoRegex.test(value)
  }

  const handleSave = async () => {
    setError(null)
    
    // Validate format
    if (!repo.trim()) {
      setError('Please enter a repository')
      return
    }
    
    if (!validateRepoFormat(repo.trim())) {
      setError('Invalid format. Use: owner/repo (e.g., myorg/myrepo)')
      return
    }

    setIsSaving(true)
    
    try {
      await onSave(repo.trim())
      onClose()
      setRepo('')
    } catch (err: any) {
      setError(err.message || 'Failed to save repository')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      setRepo(currentRepo)
      setError(null)
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Github className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Connect GitHub Repository
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Connect <span className="font-semibold text-gray-900 dark:text-white">{siteName}</span> to a GitHub repository to automatically create issues for accessibility violations.
              </p>
              
              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Format: owner/repo</p>
                    <p className="text-xs">Example: <code className="bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">acme-corp/website</code></p>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div>
                <label 
                  htmlFor="github-repo" 
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Repository
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Github className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    id="github-repo"
                    type="text"
                    value={repo}
                    onChange={(e) => {
                      setRepo(e.target.value)
                      setError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSaving) {
                        handleSave()
                      }
                    }}
                    placeholder="owner/repo"
                    disabled={isSaving}
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent",
                      "disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed",
                      error
                        ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10"
                        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800",
                      "text-gray-900 dark:text-white placeholder:text-gray-400"
                    )}
                  />
                </div>
                
                {/* Error Message */}
                {error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all shadow-sm",
                isSaving
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-purple-500/20 hover:shadow-purple-500/30 hover:shadow-lg"
              )}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Github className="w-4 h-4" />
                  <span>Save Repository</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

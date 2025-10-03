'use client'

import { useState } from 'react'
import { Github, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface RepositorySettingsProps {
  siteId: string
  initialRepo?: string | null
  initialMode?: 'issue_only' | 'pr' | null
}

export function RepositorySettings({ siteId, initialRepo, initialMode }: RepositorySettingsProps) {
  const [repository, setRepository] = useState(initialRepo || '')
  const [repositoryMode, setRepositoryMode] = useState<'issue_only' | 'pr'>(initialMode || 'issue_only')
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    isPrivate?: boolean
    error?: string
  } | null>(null)

  const validateRepository = async () => {
    if (!repository.trim()) {
      setValidationResult(null)
      return
    }

    setIsValidating(true)
    setValidationResult(null)

    try {
      const response = await fetch('/api/github/validate-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository: repository.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        setValidationResult({
          valid: false,
          error: data.error || 'Failed to validate repository'
        })
        return
      }

      setValidationResult({
        valid: true,
        isPrivate: data.isPrivate
      })
      
      toast.success('Repository validated successfully!')
    } catch (error: any) {
      console.error('Validation error:', error)
      setValidationResult({
        valid: false,
        error: error.message || 'Failed to validate repository'
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_repo: repository.trim() || null,
          repository_mode: repositoryMode
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      toast.success('Repository settings saved successfully!')
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error(error.message || 'Failed to save repository settings')
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = 
    repository.trim() !== (initialRepo || '') || 
    repositoryMode !== (initialMode || 'issue_only')

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Github className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          GitHub Integration
        </h2>
      </div>

      <div className="space-y-6">
        {/* Repository Mode Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Integration Mode
          </label>
          <div className="grid grid-cols-2 gap-4">
            {/* Issue-Only Mode */}
            <button
              onClick={() => setRepositoryMode('issue_only')}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                repositoryMode === 'issue_only'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Issue-Only
                </h3>
                {repositoryMode === 'issue_only' && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create GitHub Issues for tracking violations. Best for project management repos.
              </p>
            </button>

            {/* PR Mode (Future) */}
            <button
              onClick={() => setRepositoryMode('pr')}
              disabled
              className={`relative p-4 rounded-lg border-2 transition-all text-left opacity-50 cursor-not-allowed ${
                repositoryMode === 'pr'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
              title="PR mode coming soon"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    PR Mode
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                    Soon
                  </span>
                </div>
                {repositoryMode === 'pr' && (
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate automated PRs with code fixes. For code repositories.
              </p>
            </button>
          </div>
        </div>

        {/* Repository Input */}
        <div>
          <label htmlFor="repository" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            GitHub Repository
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                id="repository"
                value={repository}
                onChange={(e) => {
                  setRepository(e.target.value)
                  setValidationResult(null)
                }}
                placeholder="owner/repo (e.g., acme-corp/website)"
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:border-transparent transition-colors ${
                  validationResult?.valid
                    ? 'border-green-300 dark:border-green-600 focus:ring-green-500'
                    : validationResult?.error
                    ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                }`}
              />
            </div>
            <button
              onClick={validateRepository}
              disabled={isValidating || !repository.trim()}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isValidating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Validate'
              )}
            </button>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`mt-2 flex items-center gap-2 text-sm ${
              validationResult.valid
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {validationResult.valid ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    Repository validated successfully
                    {validationResult.isPrivate && ' (private repository)'}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>{validationResult.error}</span>
                </>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Format: <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">owner/repo</code>
            {repositoryMode === 'issue_only' && ' (for issue tracking)'}
            {repositoryMode === 'pr' && ' (must contain your site\'s code)'}
          </p>
        </div>

        {/* Info Box */}
        {repository.trim() && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-200">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1">
                  {repositoryMode === 'issue_only' ? (
                    <>
                      <li>When you click "Create GitHub Issue" on a violation, we'll create a detailed issue in this repository</li>
                      <li>Each issue includes the violation details, WCAG references, and step-by-step remediation guidance</li>
                      <li>Issues link back to the full report in Auditvia</li>
                    </>
                  ) : (
                    <>
                      <li>Auditvia will analyze your code and generate automated fix PRs</li>
                      <li>Each PR contains code changes with detailed explanations</li>
                      <li>You review and merge when ready</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Repository Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

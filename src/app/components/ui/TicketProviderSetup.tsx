'use client'

/**
 * Ticket Provider Setup
 * Configure GitHub or Jira integrations
 */

import { useState } from 'react'
import { Github, Loader2, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface TicketProviderSetupProps {
  teamId: string
  existingProvider?: any
  onSave?: () => void
}

export function TicketProviderSetup({
  teamId,
  existingProvider,
  onSave,
}: TicketProviderSetupProps) {
  const [providerType, setProviderType] = useState<'github' | 'jira'>(
    existingProvider?.provider_type || 'github'
  )
  const [isLoading, setIsLoading] = useState(false)

  // GitHub fields
  const [githubOwner, setGithubOwner] = useState(existingProvider?.config?.owner || '')
  const [githubRepo, setGithubRepo] = useState(existingProvider?.config?.repo || '')
  const [githubToken, setGithubToken] = useState('')

  // Jira fields
  const [jiraHost, setJiraHost] = useState(existingProvider?.config?.host || '')
  const [jiraProject, setJiraProject] = useState(existingProvider?.config?.project_key || '')
  const [jiraToken, setJiraToken] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const config =
        providerType === 'github'
          ? {
              owner: githubOwner,
              repo: githubRepo,
              labels: ['accessibility', 'bug'],
            }
          : {
              host: jiraHost,
              project_key: jiraProject,
              issue_type: 'Bug',
            }

      const token = providerType === 'github' ? githubToken : jiraToken

      if (!token) {
        toast.error('API token is required')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/ticket-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          provider_type: providerType,
          config,
          encrypted_token: token, // In production, this should be encrypted client-side
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save provider')
      }

      toast.success('Integration saved successfully!')
      onSave?.()
    } catch (error: any) {
      console.error('Failed to save provider:', error)
      toast.error(error.message || 'Failed to save integration')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Ticket Integration
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Provider type selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Provider
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="provider"
                value="github"
                checked={providerType === 'github'}
                onChange={() => setProviderType('github')}
                className="text-purple-600"
              />
              <Github className="w-5 h-5" />
              <span className="text-sm">GitHub</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="provider"
                value="jira"
                checked={providerType === 'jira'}
                onChange={() => setProviderType('jira')}
                className="text-purple-600"
              />
              <span className="text-sm">Jira</span>
            </label>
          </div>
        </div>

        {/* GitHub fields */}
        {providerType === 'github' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repository Owner
              </label>
              <input
                type="text"
                value={githubOwner}
                onChange={(e) => setGithubOwner(e.target.value)}
                placeholder="your-org or username"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Organization or username</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repository Name
              </label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="repo-name"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Personal Access Token
              </label>
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_••••••••••••••••"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Create a token at{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  github.com/settings/tokens
                </a>{' '}
                with <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">repo</code> scope
              </p>
            </div>
          </>
        )}

        {/* Jira fields */}
        {providerType === 'jira' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Jira Host
              </label>
              <input
                type="text"
                value={jiraHost}
                onChange={(e) => setJiraHost(e.target.value)}
                placeholder="your-company.atlassian.net"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Key
              </label>
              <input
                type="text"
                value={jiraProject}
                onChange={(e) => setJiraProject(e.target.value)}
                placeholder="PROJ"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">Your Jira project key (e.g., PROJ, BUG)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Token
              </label>
              <input
                type="password"
                value={jiraToken}
                onChange={(e) => setJiraToken(e.target.value)}
                placeholder="email:api_token"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Format: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">email:token</code>. Create at{' '}
                <a
                  href="https://id.atlassian.com/manage-profile/security/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  Atlassian Account
                </a>
              </p>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Integration
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">Security Note</p>
            <p className="text-blue-800 dark:text-blue-200">
              API tokens are encrypted before storage. In production, consider using OAuth for GitHub
              or Atlassian Connect for Jira for enhanced security.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

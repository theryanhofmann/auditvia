'use client'

/**
 * Create Tickets Button
 * Bulk ticket creation UI for GitHub/Jira
 */

import { useState, useEffect } from 'react'
import { Ticket, ChevronDown, Check, AlertCircle, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Issue {
  id: string
  rule: string
  impact: string
  description: string
  help_url: string
  selector: string
  html: string
}

interface TicketProvider {
  id: string
  provider_type: 'github' | 'jira'
  config: {
    owner?: string
    repo?: string
    host?: string
    project_key?: string
  }
  is_active: boolean
}

interface CreateTicketsButtonProps {
  scanId: string
  teamId: string
  issues: Issue[]
  className?: string
}

export function CreateTicketsButton({
  scanId,
  teamId,
  issues,
  className = '',
}: CreateTicketsButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [providers, setProviders] = useState<TicketProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [createdTickets, setCreatedTickets] = useState<any[]>([])

  // Group issues by rule
  const issueGroups = issues.reduce((acc, issue) => {
    if (!acc[issue.rule]) {
      acc[issue.rule] = {
        rule: issue.rule,
        count: 0,
        impact: issue.impact,
        description: issue.description,
      }
    }
    acc[issue.rule].count++
    return acc
  }, {} as Record<string, any>)

  const ruleOptions = Object.values(issueGroups).sort((a: any, b: any) => {
    const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 }
    return (impactOrder[a.impact as keyof typeof impactOrder] || 4) - 
           (impactOrder[b.impact as keyof typeof impactOrder] || 4)
  })

  // Fetch providers on mount
  useEffect(() => {
    if (isOpen && providers.length === 0) {
      fetchProviders()
    }
  }, [isOpen])

  // Debug: Log teamId
  useEffect(() => {
    console.log('🎫 [CreateTicketsButton] teamId:', teamId)
  }, [teamId])

  const fetchProviders = async () => {
    try {
      const response = await fetch(`/api/ticket-providers?team_id=${teamId}`)
      if (response.ok) {
        const data = await response.json()
        setProviders(data.providers || [])
        if (data.providers?.length > 0) {
          setSelectedProvider(data.providers[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error)
    }
  }

  const toggleRule = (rule: string) => {
    const newSelected = new Set(selectedRules)
    if (newSelected.has(rule)) {
      newSelected.delete(rule)
    } else {
      newSelected.add(rule)
    }
    setSelectedRules(newSelected)
  }

  const selectAll = () => {
    setSelectedRules(new Set(ruleOptions.map((r: any) => r.rule)))
  }

  const deselectAll = () => {
    setSelectedRules(new Set())
  }

  const handlePreview = async () => {
    if (selectedRules.size === 0) {
      toast.error('Please select at least one issue type')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/scans/${scanId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: selectedProvider,
          rule_ids: Array.from(selectedRules),
          dry_run: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Preview failed')
      }

      setPreview(data.preview || [])
      setShowPreview(true)
    } catch (error: any) {
      console.error('Preview failed:', error)
      toast.error(error.message || 'Failed to generate preview')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async () => {
    if (selectedRules.size === 0) {
      toast.error('Please select at least one issue type')
      return
    }

    setIsLoading(true)
    const toastId = toast.loading('Creating tickets...')

    try {
      const response = await fetch(`/api/scans/${scanId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: selectedProvider,
          rule_ids: Array.from(selectedRules),
          dry_run: false,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ticket creation failed')
      }

      const created = data.created || []
      const failed = data.failed || []

      if (created.length > 0) {
        setCreatedTickets(created)
        toast.success(
          `Created ${created.length} ticket${created.length === 1 ? '' : 's'}!`,
          { id: toastId }
        )
      }

      if (failed.length > 0) {
        toast.error(`${failed.length} ticket${failed.length === 1 ? '' : 's'} failed`, {
          id: toastId,
        })
      }

      // Reset state
      setSelectedRules(new Set())
      setShowPreview(false)
      setIsOpen(false)
    } catch (error: any) {
      console.error('Ticket creation failed:', error)
      toast.error(error.message || 'Failed to create tickets', { id: toastId })
    } finally {
      setIsLoading(false)
    }
  }

  if (providers.length === 0 && isOpen) {
    return (
      <div className={cn('relative', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Ticket className="w-4 h-4" />
          Create Tickets
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No ticket providers configured
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                Set up GitHub or Jira integration to create tickets from scan results
              </p>
              {teamId ? (
                <a
                  href={`/dashboard/teams/${teamId}/settings`}
                  onClick={(e) => {
                    console.log('🎫 [CreateTicketsButton] Navigating to:', `/dashboard/teams/${teamId}/settings`)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Go to Team Settings
                </a>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Team ID not available. Please refresh the page.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={issues.length === 0}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Ticket className="w-4 h-4" />
        Create Tickets
        {createdTickets.length > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
            {createdTickets.length}
          </span>
        )}
      </button>

      {isOpen && !showPreview && (
        <div className="absolute right-0 mt-2 w-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Tickets
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Select issues to create tickets for
            </p>
          </div>

          <div className="p-4">
            {/* Provider selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.provider_type === 'github'
                      ? `GitHub: ${provider.config.owner}/${provider.config.repo}`
                      : `Jira: ${provider.config.project_key}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Rule selection */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Issues ({selectedRules.size} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-purple-600 hover:text-purple-700"
                  >
                    Select all
                  </button>
                  <button
                    onClick={deselectAll}
                    className="text-xs text-gray-600 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {ruleOptions.map((group: any) => (
                  <label
                    key={group.rule}
                    className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRules.has(group.rule)}
                      onChange={() => toggleRule(group.rule)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {group.rule}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs rounded-full',
                            group.impact === 'critical' && 'bg-red-100 text-red-800',
                            group.impact === 'serious' && 'bg-orange-100 text-orange-800',
                            group.impact === 'moderate' && 'bg-yellow-100 text-yellow-800',
                            group.impact === 'minor' && 'bg-blue-100 text-blue-800'
                          )}
                        >
                          {group.impact}
                        </span>
                        <span className="text-xs text-gray-500">
                          {group.count} {group.count === 1 ? 'instance' : 'instances'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {group.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <button
              onClick={handlePreview}
              disabled={isLoading || selectedRules.size === 0}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Preview
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading || selectedRules.size === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create {selectedRules.size > 0 && `(${selectedRules.size})`}
            </button>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Preview Tickets
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Review tickets before creating
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)] space-y-4">
              {preview.map((ticket, i) => (
                <div
                  key={ticket.rule}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {ticket.title}
                  </h4>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-x-auto bg-gray-50 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-48">
                    {ticket.body}
                  </pre>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Tickets
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

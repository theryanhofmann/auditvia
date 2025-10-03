'use client'

import { useState } from 'react'
import { ChevronDown, ExternalLink, Lightbulb, Code2, AlertTriangle, GitPullRequest, Tag } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { getRemediationGuide, getQuickFix } from '@/lib/remediation-guide'
import { RepoConfigModal } from './RepoConfigModal'
import { GitHubSetupModal } from './GitHubSetupModal'
import toast from 'react-hot-toast'

interface ViolationAccordionProps {
  rule: string
  description: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  selector: string
  html?: string | null
  help_url?: string | null
  wcagTags?: string[]
  violationId?: string
  siteId?: string
  siteName?: string
  scanId?: string
  repositoryMode?: 'issue_only' | 'pr'
  githubIssueUrl?: string | null
  githubIssueNumber?: number | null
}

export function ViolationAccordion({
  rule,
  description,
  impact,
  selector,
  html,
  help_url,
  wcagTags = [],
  violationId,
  siteId,
  siteName,
  scanId,
  repositoryMode = 'issue_only',
  githubIssueUrl,
  githubIssueNumber
}: ViolationAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isGeneratingPR, setIsGeneratingPR] = useState(false)
  const [isRepoModalOpen, setIsRepoModalOpen] = useState(false)
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false)
  const [setupErrorCode, setSetupErrorCode] = useState<'missing_env' | 'insufficient_permissions'>()
  const [missingEnvVars, setMissingEnvVars] = useState<string[]>([])
  
  // Initialize with existing GitHub issue if present
  const [createdIssue, setCreatedIssue] = useState<{ url: string; number: number } | null>(
    githubIssueUrl && githubIssueNumber
      ? { url: githubIssueUrl, number: githubIssueNumber }
      : null
  )

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'serious':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'critical':
      case 'serious':
        return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'moderate':
        return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    }
  }

  // Get comprehensive remediation guidance
  const remediationGuide = getRemediationGuide(rule, html || undefined, selector)

  const handleGeneratePR = async () => {
    // Validate required data
    if (!siteId || !scanId || !violationId) {
      toast.error('Missing required data to create GitHub issue')
      console.error('🔧 [ViolationAccordion] Missing required props:', { siteId, scanId, violationId })
      return
    }

    setIsGeneratingPR(true)
    console.log('🔧 [ViolationAccordion] Creating GitHub issue for:', rule)
    console.log('🔧 [ViolationAccordion] Request data:', {
      siteId,
      siteName,
      scanId,
      violationId,
      ruleId: rule
    })

    try {
      const response = await fetch('/api/github/create-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          scanId,
          violation: {
            id: violationId,
            ruleId: rule,
            impact,
            selector,
            html: html || undefined,
            description,
            wcagTags
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error codes with user-friendly messages
        if (data.code === 'REPO_NOT_CONFIGURED') {
          console.log('⚠️ [ViolationAccordion] Repo not configured, opening modal')
          setIsRepoModalOpen(true)
          setIsGeneratingPR(false)
          return
        }
        
        if (data.code === 'missing_env') {
          console.log('⚠️ [ViolationAccordion] Missing environment variables:', data.needed)
          setSetupErrorCode('missing_env')
          setMissingEnvVars(data.needed || [])
          setIsGeneratingPR(false)
          toast.error(
            (t) => (
              <div className="flex flex-col gap-2">
                <p className="font-semibold">GitHub Not Configured</p>
                <p className="text-sm">{data.message || 'Missing required environment variables.'}</p>
                <button
                  onClick={() => {
                    toast.dismiss(t.id)
                    setIsSetupModalOpen(true)
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium underline text-left"
                >
                  View Setup Instructions →
                </button>
              </div>
            ),
            { duration: 10000 }
          )
          return
        }
        
        if (data.code === 'insufficient_permissions') {
          console.log('⚠️ [ViolationAccordion] Insufficient permissions')
          setSetupErrorCode('insufficient_permissions')
          setIsGeneratingPR(false)
          toast.error(
            (t) => (
              <div className="flex flex-col gap-2">
                <p className="font-semibold">Insufficient Permissions</p>
                <p className="text-sm">{data.message || 'Your GitHub token lacks required permissions.'}</p>
                <button
                  onClick={() => {
                    toast.dismiss(t.id)
                    setIsSetupModalOpen(true)
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium underline text-left"
                >
                  Fix Permissions →
                </button>
              </div>
            ),
            { duration: 10000 }
          )
          return
        }

        // Show actionable error message if available
        const errorMessage = data.actionable || data.error || 'Failed to create GitHub issue'
        throw new Error(errorMessage)
      }

      // Success!
      console.log('✅ [ViolationAccordion] GitHub issue created:', data)
      console.log('✅ [ViolationAccordion] Issue URL:', data.issueUrl)
      console.log('✅ [ViolationAccordion] Issue Number:', data.issueNumber)
      
      // Store the created issue info
      setCreatedIssue({
        url: data.issueUrl,
        number: data.issueNumber
      })
      
      // Show success toast with link to the created issue
      toast.success(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="font-semibold">✅ GitHub Issue Created!</p>
            <a
              href={data.issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium underline inline-flex items-center gap-1"
              onClick={() => toast.dismiss(t.id)}
            >
              <ExternalLink className="w-3 h-3" />
              Open Issue #{data.issueNumber}
            </a>
          </div>
        ),
        { duration: 8000 }
      )
      
      setIsGeneratingPR(false)
    } catch (error: any) {
      console.error('❌ [ViolationAccordion] Error creating GitHub issue:', error)
      toast.error(error.message || 'Failed to create GitHub issue')
    } finally {
      setIsGeneratingPR(false)
    }
  }

  const handleSaveRepo = async (repo: string) => {
    if (!siteId) {
      throw new Error('Site ID is required')
    }

    console.log('💾 [ViolationAccordion] Saving GitHub repo:', repo)

    const response = await fetch(`/api/sites/${siteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ github_repo: repo })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to save repository')
    }

    console.log('✅ [ViolationAccordion] Repository saved, retrying issue creation')
    toast.success('Repository configured! Creating issue...')
    
    // Close modal and retry issue creation
    setIsRepoModalOpen(false)
    
    // Small delay to ensure DB is updated
    setTimeout(() => {
      handleGeneratePR()
    }, 500)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-5 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getImpactIcon(impact)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title + Impact Badge */}
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                {rule}
              </h3>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0",
                getImpactColor(impact)
              )}>
                {impact.charAt(0).toUpperCase() + impact.slice(1)}
              </span>
            </div>

            {/* WCAG Tags */}
            {wcagTags && wcagTags.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                <div className="flex flex-wrap gap-1.5">
                  {wcagTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Fix Summary (collapsed state) */}
            {!isExpanded && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {getQuickFix(rule)}
              </p>
            )}
          </div>

          {/* Chevron */}
          <div className="flex-shrink-0">
            <ChevronDown 
              className={cn(
                "w-5 h-5 text-gray-500 transition-transform mt-1",
                isExpanded && "transform rotate-180"
              )} 
            />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="px-5 py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-5">
            {/* Issue Description */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-2 flex items-center gap-2">
                <div className="w-1 h-4 bg-gray-400 rounded-full" />
                Issue Description
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {description}
              </p>
            </div>

            {/* How to Fix - Primary Section */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-lg shadow-sm">
                  <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-blue-900 dark:text-blue-100 mb-1">
                    {remediationGuide.title}
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    {remediationGuide.description}
                  </p>
                </div>
              </div>

              {/* Step-by-step instructions */}
              <div className="bg-white/60 dark:bg-gray-900/30 rounded-lg p-4 border border-blue-200/50 dark:border-blue-800/50">
                <p className="text-xs font-bold text-blue-900 dark:text-blue-100 mb-3 uppercase tracking-wide">
                  Steps to Fix
                </p>
                <ol className="space-y-2.5">
                  {remediationGuide.steps.map((step, index) => (
                    <li key={index} className="flex gap-3 text-sm text-blue-900 dark:text-blue-100">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="flex-1 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* WCAG Criteria Reference */}
              <div className="mt-4 pt-4 border-t-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-semibold">WCAG Reference:</span> {remediationGuide.wcagCriteria}
                  </p>
                </div>
              </div>
            </div>

            {/* Code Example (if available) */}
            {remediationGuide.codeExample && (
              <div className="bg-gray-900 dark:bg-gray-950 border border-gray-700 dark:border-gray-800 rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
                  <Code2 className="w-4 h-4 text-gray-400" />
                  <h4 className="text-sm font-semibold text-gray-200">
                    Code Example
                  </h4>
                </div>
                <pre className="p-4 text-xs font-mono text-green-400 dark:text-green-300 whitespace-pre-wrap overflow-x-auto">
                  {remediationGuide.codeExample}
                </pre>
              </div>
            )}

            {/* Actions Row */}
            <div className="flex items-center gap-3 pt-2">
              {/* View Issue Button (if already created) OR Generate PR / Create Issue Button */}
              {createdIssue ? (
                <a
                  href={createdIssue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-green-500/20 hover:shadow-green-500/30 hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View Issue #{createdIssue.number}</span>
                </a>
              ) : (
                <button
                  onClick={handleGeneratePR}
                  disabled={isGeneratingPR}
                  title={
                    repositoryMode === 'issue_only'
                      ? "This site isn't connected to a code repo. We'll file a tracking issue instead."
                      : "Generate a pull request with automated fix"
                  }
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm transition-all shadow-sm",
                    isGeneratingPR
                      ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-purple-500/20 hover:shadow-purple-500/30 hover:shadow-lg transform hover:-translate-y-0.5"
                  )}
                >
                  {isGeneratingPR ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      <span>{repositoryMode === 'issue_only' ? 'Creating Issue...' : 'Generating PR...'}</span>
                    </>
                  ) : (
                    <>
                      <GitPullRequest className="w-4 h-4" />
                      <span>{repositoryMode === 'issue_only' ? 'Create GitHub Issue' : 'Generate Fix PR'}</span>
                    </>
                  )}
                </button>
              )}

              {/* WCAG Guidelines Link */}
              {help_url && (
                <a
                  href={help_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">WCAG Docs</span>
                  <span className="sm:hidden">Docs</span>
                </a>
              )}
            </div>

            {/* Technical Details */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-200 mb-3 flex items-center gap-2">
                <div className="w-1 h-4 bg-gray-400 rounded-full" />
                Technical Details
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    CSS Selector:
                  </p>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <code className="font-mono text-sm text-gray-800 dark:text-gray-300 break-all">
                      {selector}
                    </code>
                  </div>
                </div>
                {html && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      HTML Snippet:
                    </p>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 max-h-40 overflow-y-auto">
                      <pre className="font-mono text-xs text-gray-700 dark:text-gray-400 whitespace-pre-wrap">
                        {html}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Repository Configuration Modal */}
      <RepoConfigModal
        isOpen={isRepoModalOpen}
        onClose={() => setIsRepoModalOpen(false)}
        onSave={handleSaveRepo}
        siteName={siteName || 'this site'}
      />

      {/* GitHub Setup Modal */}
      <GitHubSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        errorCode={setupErrorCode}
        missingVars={missingEnvVars}
      />
    </div>
  )
} 
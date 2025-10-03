'use client'

/**
 * Auto-Fix Flow
 * Orchestrates the fix preview → apply → rescan workflow for Founder mode
 */

import { useState } from 'react'
import { Sparkles, Zap, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { WebflowConnect } from './WebflowConnect'
import { FixPreviewModal } from './FixPreviewModal'
import type { WebflowFixPreview } from '@/lib/integrations/webflow-client'
import { scanAnalytics } from '@/lib/safe-analytics'

interface AutoFixFlowProps {
  scanId: string
  teamId: string
  siteId: string
  siteName: string
  platform?: string
  onRescanTriggered?: () => void
}

type FlowState = 'idle' | 'checking-connection' | 'need-connection' | 'loading-preview' | 'preview-ready' | 'applying' | 'applied' | 'error'

export function AutoFixFlow({
  scanId,
  teamId,
  siteId,
  siteName,
  platform,
  onRescanTriggered
}: AutoFixFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [previews, setPreviews] = useState<WebflowFixPreview[]>([])
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [appliedCount, setAppliedCount] = useState(0)
  const [isDryRun, setIsDryRun] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Only show for Webflow sites (for now)
  if (platform !== 'webflow') {
    return null
  }

  const handleFixTopIssues = async () => {
    setFlowState('loading-preview')
    setErrorMessage(null)

    try {
      // Request fix preview
      const response = await fetch('/api/integrations/webflow/preview-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId, teamId, siteId })
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.needsConnection) {
          setFlowState('need-connection')
          return
        }
        
        throw new Error(data.error || 'Failed to generate preview')
      }

      console.log('✅ [AutoFix] Preview loaded:', data.summary)

      setPreviews(data.previews || [])
      setIsDryRun(data.isDryRun !== false) // Default to true for safety
      setFlowState('preview-ready')
      setShowPreviewModal(true)

      await scanAnalytics.track('fix_preview_opened', {
        scan_id: scanId,
        team_id: teamId,
        site_id: siteId,
        previews_count: data.previews?.length || 0
      })

    } catch (error) {
      console.error('❌ [AutoFix] Preview error:', error)
      setFlowState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load preview')
    }
  }

  const handleApplyFixes = async () => {
    setFlowState('applying')
    
    try {
      // Apply fixes
      const response = await fetch('/api/integrations/webflow/apply-fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId,
          teamId,
          siteId,
          fixes: previews
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to apply fixes')
      }

      console.log('✅ [AutoFix] Fixes applied:', data.summary)

      setAppliedCount(data.summary.applied + data.summary.dry_run)
      setFlowState('applied')
      setShowPreviewModal(false)

      await scanAnalytics.track('fixes_application_completed', {
        scan_id: scanId,
        team_id: teamId,
        site_id: siteId,
        total: data.summary.total,
        applied: data.summary.applied,
        dry_run: data.summary.dry_run,
        skipped: data.summary.skipped
      })

      // Auto-trigger rescan after a short delay
      setTimeout(() => {
        handleRescan()
      }, 2000)

    } catch (error) {
      console.error('❌ [AutoFix] Apply error:', error)
      setFlowState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to apply fixes')
    }
  }

  const handleRescan = async () => {
    try {
      await scanAnalytics.track('rescan_triggered_after_fix', {
        scan_id: scanId,
        team_id: teamId,
        site_id: siteId
      })

      // Trigger rescan via API
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, teamId })
      })

      if (response.ok) {
        console.log('✅ [AutoFix] Rescan triggered')
        onRescanTriggered?.()
      }
    } catch (error) {
      console.error('❌ [AutoFix] Rescan error:', error)
    }
  }

  const handleConnectionComplete = () => {
    setFlowState('idle')
  }

  // Show connection prompt if needed
  if (flowState === 'need-connection') {
    return (
      <div className="p-6 border border-blue-200 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">
              Connect Webflow to Enable Auto-Fix
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              To apply fixes automatically, we need permission to access your Webflow site. 
              This is a one-time setup.
            </p>
            <WebflowConnect 
              teamId={teamId} 
              onConnected={handleConnectionComplete}
              variant="button"
            />
          </div>
        </div>
      </div>
    )
  }

  // Show success state after fixes applied
  if (flowState === 'applied') {
    return (
      <div className="p-6 border border-green-200 bg-green-50 rounded-lg">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-1">
              {isDryRun ? 'Dry-Run Complete' : `${appliedCount} Fix${appliedCount !== 1 ? 'es' : ''} Applied`}
            </h3>
            <p className="text-sm text-green-700 mb-3">
              {isDryRun 
                ? 'Preview mode completed successfully. No changes were made to your site.'
                : 'We\'re re-scanning your site now to verify the improvements.'}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRescan}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Re-scan Now</span>
              </button>
              <button
                onClick={() => setFlowState('idle')}
                className="text-sm text-green-700 hover:text-green-800 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (flowState === 'error') {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900 mb-1">
              Something Went Wrong
            </h3>
            <p className="text-sm text-red-700 mb-3">
              {errorMessage || 'Failed to process auto-fix request. Please try again.'}
            </p>
            <button
              onClick={() => setFlowState('idle')}
              className="text-sm text-red-700 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main CTA button
  return (
    <>
      <button
        onClick={handleFixTopIssues}
        disabled={flowState === 'loading-preview'}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles className="w-5 h-5" />
        <span>
          {flowState === 'loading-preview' ? 'Loading preview...' : 'Fix Top 3 Issues Now'}
        </span>
      </button>

      {/* Preview Modal */}
      <FixPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false)
          setFlowState('idle')
        }}
        previews={previews}
        onApply={handleApplyFixes}
        isDryRun={isDryRun}
        siteName={siteName}
      />
    </>
  )
}


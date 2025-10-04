'use client'

import { useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'
import { isEnterpriseGatingEnabled, isScanProfilesEnabled } from '@/lib/feature-flags'
import { scanAnalytics } from '@/lib/safe-analytics'
import { useRouter } from 'next/navigation'
import {
  ENTERPRISE_MODAL_TITLE,
  ENTERPRISE_MODAL_BODY,
  ENTERPRISE_MODAL_CTA_UPGRADE,
  ENTERPRISE_MODAL_CTA_SAMPLE,
  ENTERPRISE_MODAL_UPGRADE_URL,
  SAMPLE_REPORT_ANCHOR
} from './EnterpriseGateModal.constants'

// Re-export constants for convenience
export {
  ENTERPRISE_MODAL_TITLE,
  ENTERPRISE_MODAL_BODY,
  ENTERPRISE_MODAL_CTA_UPGRADE,
  ENTERPRISE_MODAL_CTA_SAMPLE,
  ENTERPRISE_MODAL_UPGRADE_URL,
  SAMPLE_REPORT_ANCHOR
}

interface EnterpriseGateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewSampleReport?: () => void
  discoveredUrls?: number
  scanId?: string
  siteId?: string
}

export function EnterpriseGateModal({
  open,
  onOpenChange,
  onViewSampleReport,
  discoveredUrls,
  scanId,
  siteId
}: EnterpriseGateModalProps) {
  const router = useRouter()
  const dialogTitleId = 'enterprise-modal-title'
  const dialogDescId = 'enterprise-modal-description'
  const hasEmittedShown = useRef(false)

  // Feature flag check - require BOTH flags
  if (!isEnterpriseGatingEnabled() || !isScanProfilesEnabled()) {
    return null
  }

  // Emit shown event when modal opens
  useEffect(() => {
    if (open && !hasEmittedShown.current) {
      scanAnalytics.enterpriseModalShown({
        scanId: scanId || 'unknown',
        siteId: siteId || 'unknown',
        discoveredUrls: discoveredUrls || 0
      })
      hasEmittedShown.current = true
    }

    // Reset flag when modal closes
    if (!open) {
      hasEmittedShown.current = false
    }
  }, [open, scanId, siteId, discoveredUrls])

  const handleUpgrade = () => {
    scanAnalytics.enterpriseModalUpgradeClick({
      scanId: scanId || 'unknown',
      siteId: siteId || 'unknown'
    })
    window.location.href = ENTERPRISE_MODAL_UPGRADE_URL
    onOpenChange(false)
  }

  const handleViewSampleReport = () => {
    scanAnalytics.enterpriseModalSampleClick({
      scanId: scanId || 'unknown',
      siteId: siteId || 'unknown'
    })

    // Navigate to sample report with query param and anchor
    const currentPath = window.location.pathname
    router.push(`${currentPath}?view=sample#${SAMPLE_REPORT_ANCHOR}`)

    onViewSampleReport?.()
    onOpenChange(false)

    // Focus the sample report section after navigation
    setTimeout(() => {
      const sampleSection = document.getElementById(SAMPLE_REPORT_ANCHOR)
      if (sampleSection) {
        sampleSection.focus()
        sampleSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const handleDismiss = (open: boolean) => {
    if (!open) {
      scanAnalytics.enterpriseModalDismiss({
        scanId: scanId || 'unknown',
        siteId: siteId || 'unknown'
      })
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent
        className="sm:max-w-md"
        role="dialog"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDescId}
      >
        <DialogHeader>
          <DialogTitle
            id={dialogTitleId}
            className="text-xl font-semibold"
          >
            {ENTERPRISE_MODAL_TITLE}
          </DialogTitle>
          <DialogDescription
            id={dialogDescId}
            className="pt-4 text-base"
          >
            {ENTERPRISE_MODAL_BODY}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          <Button
            className="w-full"
            onClick={handleUpgrade}
          >
            {ENTERPRISE_MODAL_CTA_UPGRADE}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleViewSampleReport}
          >
            {ENTERPRISE_MODAL_CTA_SAMPLE}
          </Button>
        </div>

        {discoveredUrls && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">
            {discoveredUrls}+ pages detected
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

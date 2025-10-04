'use client'

import { useEffect, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { isEnterpriseGatingEnabled, isScanProfilesEnabled } from '@/lib/feature-flags'
import { scanAnalytics } from '@/lib/safe-analytics'
import {
  ENTERPRISE_BANNER_TITLE,
  ENTERPRISE_BANNER_BODY,
  ENTERPRISE_BANNER_CTA_UPGRADE,
  ENTERPRISE_BANNER_UPGRADE_URL
} from './EnterpriseGateBanner.constants'

// Re-export constants for convenience
export {
  ENTERPRISE_BANNER_TITLE,
  ENTERPRISE_BANNER_BODY,
  ENTERPRISE_BANNER_CTA_UPGRADE,
  ENTERPRISE_BANNER_UPGRADE_URL
}

interface EnterpriseGateBannerProps {
  scanId: string
  siteId: string
  discoveredPages?: number
}

export function EnterpriseGateBanner({
  scanId,
  siteId,
  discoveredPages
}: EnterpriseGateBannerProps) {
  const hasEmittedShown = useRef(false)
  const bannerId = 'enterprise-gate-banner'
  const bannerTitleId = 'enterprise-banner-title'

  // Feature flag check - require BOTH flags
  if (!isEnterpriseGatingEnabled() || !isScanProfilesEnabled()) {
    return null
  }

  // Emit shown event on mount
  useEffect(() => {
    if (!hasEmittedShown.current) {
      scanAnalytics.enterpriseBannerShown({
        scanId,
        siteId,
        discoveredPages: discoveredPages || 0
      })
      hasEmittedShown.current = true
    }
  }, [scanId, siteId, discoveredPages])

  const handleUpgradeClick = () => {
    scanAnalytics.enterpriseBannerUpgradeClick({
      scanId,
      siteId
    })
    window.location.href = ENTERPRISE_BANNER_UPGRADE_URL
  }

  return (
    <div
      id={bannerId}
      role="region"
      aria-labelledby={bannerTitleId}
      className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />

        <div className="flex-1">
          <h3
            id={bannerTitleId}
            className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1"
          >
            {ENTERPRISE_BANNER_TITLE}
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
            {ENTERPRISE_BANNER_BODY}
          </p>

          {discoveredPages && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
              Showing results from {discoveredPages} pages
            </p>
          )}

          <Button
            size="sm"
            onClick={handleUpgradeClick}
            className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600"
          >
            {ENTERPRISE_BANNER_CTA_UPGRADE}
          </Button>
        </div>
      </div>
    </div>
  )
}

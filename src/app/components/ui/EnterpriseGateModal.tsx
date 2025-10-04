'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'
import { isEnterpriseGatingEnabled } from '@/lib/feature-flags'

interface EnterpriseGateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewSampleReport?: () => void
  discoveredUrls?: number
}

export function EnterpriseGateModal({
  open,
  onOpenChange,
  onViewSampleReport,
  discoveredUrls
}: EnterpriseGateModalProps) {
  // Feature flag check
  if (!isEnterpriseGatingEnabled()) {
    return null
  }

  const handleUpgrade = () => {
    window.location.href = '/pricing#enterprise'
    onOpenChange(false)
  }

  const handleViewSampleReport = () => {
    onViewSampleReport?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Enterprise Scan Required
          </DialogTitle>
          <DialogDescription className="pt-4 text-base">
            This site exceeds the limits of your current plan. To unlock full scan coverage and complete compliance reporting, you&apos;ll need to upgrade to Enterprise.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-4">
          <Button
            className="w-full"
            onClick={handleUpgrade}
          >
            Upgrade to Enterprise
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleViewSampleReport}
          >
            View Sample Report
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

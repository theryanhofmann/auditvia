'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upgrade to Pro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Get access to advanced features like:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
            <li>Scan comparison and history</li>
            <li>Custom scheduling</li>
            <li>Priority support</li>
            <li>API access</li>
          </ul>
          <Button
            className="w-full"
            onClick={() => {
              window.location.href = '/pricing'
              onOpenChange(false)
            }}
          >
            View Plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 
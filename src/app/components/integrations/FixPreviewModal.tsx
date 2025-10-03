'use client'

/**
 * Fix Preview Modal
 * Shows a preview of fixes that will be applied before execution
 */

import { useState } from 'react'
import { X, Check, AlertTriangle, Code, Sparkles, ExternalLink, Loader2 } from 'lucide-react'
import type { WebflowFixPreview } from '@/lib/integrations/webflow-client'

interface FixPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  previews: WebflowFixPreview[]
  onApply: () => Promise<void>
  isDryRun?: boolean
  siteName?: string
}

export function FixPreviewModal({
  isOpen,
  onClose,
  previews,
  onApply,
  isDryRun = true,
  siteName
}: FixPreviewModalProps) {
  const [isApplying, setIsApplying] = useState(false)

  if (!isOpen) return null

  const autoFixable = previews.filter(p => p.canAutoFix)
  const manualRequired = previews.filter(p => p.requiresManual)

  const handleApply = async () => {
    setIsApplying(true)
    try {
      await onApply()
    } finally {
      setIsApplying(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-700 bg-red-50 border-red-200'
      case 'serious': return 'text-orange-700 bg-orange-50 border-orange-200'
      case 'moderate': return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      default: return 'text-blue-700 bg-blue-50 border-blue-200'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Fix Preview</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Review changes before applying to {siteName || 'your site'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Check className="w-4 h-4" />
                  <span className="font-semibold">Auto-fixable</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{autoFixable.length}</p>
                <p className="text-xs text-blue-600 mt-1">Can be applied automatically</p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-semibold">Manual required</span>
                </div>
                <p className="text-2xl font-bold text-yellow-900">{manualRequired.length}</p>
                <p className="text-xs text-yellow-600 mt-1">Need human review</p>
              </div>
            </div>

            {/* Dry-run notice */}
            {isDryRun && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900 mb-1">Preview Mode (No Changes Will Be Made)</p>
                  <p className="text-amber-700">
                    This is a dry-run preview. No actual changes will be applied to your Webflow site. 
                    You can safely review what would happen.
                  </p>
                </div>
              </div>
            )}

            {/* Fix List */}
            <div className="space-y-4">
              {previews.map((preview, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  {/* Fix header */}
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${getSeverityColor(preview.severity)}`}>
                            {preview.severity}
                          </span>
                          {preview.requiresManual && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                              <AlertTriangle className="w-3 h-3" />
                              Manual
                            </span>
                          )}
                          {preview.canAutoFix && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              <Sparkles className="w-3 h-3" />
                              Auto-fix
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900">{preview.issueType}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          WCAG {preview.wcagCriteria.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fix details */}
                  <div className="px-4 py-3">
                    <p className="text-sm text-slate-700 mb-3">{preview.explanation}</p>

                    {/* Element selector */}
                    <div className="mb-3">
                      <p className="text-xs font-medium text-slate-500 mb-1">Element:</p>
                      <code className="text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded font-mono">
                        {preview.elementSelector}
                      </code>
                    </div>

                    {/* Before/After */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Before:</p>
                        <pre className="text-xs bg-red-50 border border-red-200 text-red-800 p-2 rounded font-mono overflow-x-auto">
                          {preview.beforeValue}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">After:</p>
                        <pre className="text-xs bg-green-50 border border-green-200 text-green-800 p-2 rounded font-mono overflow-x-auto">
                          {preview.afterValue}
                        </pre>
                      </div>
                    </div>

                    {/* Manual reason */}
                    {preview.requiresManual && preview.manualReason && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <p className="font-medium mb-1">Why manual review is needed:</p>
                        <p>{preview.manualReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* No auto-fixable issues */}
            {previews.length === 0 && (
              <div className="text-center py-12">
                <Code className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium mb-1">No auto-fixable issues found</p>
                <p className="text-sm text-slate-400">
                  All issues require manual review and human context to fix properly.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-700 font-medium"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={isApplying || previews.length === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isDryRun ? 'Processing...' : 'Applying fixes...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isDryRun ? 'Run Dry-Run' : 'Apply Fixes'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}


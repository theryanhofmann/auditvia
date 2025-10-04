'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, ExternalLink } from 'lucide-react'
import { ReactNode } from 'react'
import { focusRing } from './design-tokens'

interface RightSideDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  onExport?: () => void
  externalLink?: {
    label: string
    href: string
  }
}

export function RightSideDetailDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  onExport,
  externalLink,
}: RightSideDetailDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1200]"
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ 
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            className="
              fixed top-0 right-0 bottom-0
              w-full max-w-2xl
              bg-slate-900 border-l border-slate-700
              shadow-2xl
              overflow-hidden
              z-[1300]
              flex flex-col
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-slate-700 bg-slate-800/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 
                    id="drawer-title"
                    className="text-2xl font-bold text-white mb-1 truncate"
                  >
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-sm text-slate-400">
                      {subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Export Button */}
                  {onExport && (
                    <button
                      onClick={onExport}
                      className={`
                        p-2 rounded-lg
                        bg-slate-700 hover:bg-slate-600
                        text-slate-300 hover:text-white
                        transition-colors
                        ${focusRing}
                      `}
                      aria-label="Export data"
                      title="Export"
                    >
                      <Download size={20} />
                    </button>
                  )}

                  {/* External Link */}
                  {externalLink && (
                    <a
                      href={externalLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`
                        p-2 rounded-lg
                        bg-slate-700 hover:bg-slate-600
                        text-slate-300 hover:text-white
                        transition-colors
                        ${focusRing}
                      `}
                      aria-label={externalLink.label}
                      title={externalLink.label}
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}

                  {/* Close Button */}
                  <button
                    onClick={onClose}
                    className={`
                      p-2 rounded-lg
                      bg-slate-700 hover:bg-slate-600
                      text-slate-300 hover:text-white
                      transition-colors
                      ${focusRing}
                    `}
                    aria-label="Close drawer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6">
                {children}
              </div>
            </div>

            {/* Footer (optional gradient fade) */}
            <div className="flex-shrink-0 h-12 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

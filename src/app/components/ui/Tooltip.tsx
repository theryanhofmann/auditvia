'use client'

import { useState, ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  content: string
  children?: ReactNode
  icon?: boolean
}

export function Tooltip({ content, children, icon = true }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help inline-flex items-center"
      >
        {children || (
          icon && <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
        )}
      </div>
      
      {isVisible && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-lg z-50 w-64 animate-fade-in pointer-events-none"
          style={{
            animation: 'fadeIn 200ms ease-out'
          }}
        >
          {content}
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-800 rotate-45" />
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}

// Specific tooltip variants for common use cases
export function InapplicableTooltip() {
  return (
    <Tooltip content="Not relevant to this page (e.g., no forms → form checks skipped)." />
  )
}

export function NeedsReviewTooltip() {
  return (
    <Tooltip content="Automated tools can't determine this reliably. Use the quick checklist to confirm." />
  )
}


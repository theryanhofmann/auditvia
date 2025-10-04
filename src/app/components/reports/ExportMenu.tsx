'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { focusRing } from './design-tokens'
import toast from 'react-hot-toast'

interface ExportMenuProps {
  onExportCSV: () => Promise<void>
  onExportPDF?: () => Promise<void>
  disabled?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ExportMenu({ 
  onExportCSV, 
  onExportPDF,
  disabled = false,
  label = 'Export',
  size = 'md'
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleExport = async (type: 'csv' | 'pdf') => {
    setIsExporting(true)
    setIsOpen(false)
    
    const toastId = toast.loading(`Preparing ${type.toUpperCase()} export...`)

    try {
      if (type === 'csv') {
        await onExportCSV()
      } else if (type === 'pdf' && onExportPDF) {
        await onExportPDF()
      }
      
      toast.success(`${type.toUpperCase()} exported successfully!`, { id: toastId })
    } catch (error) {
      console.error('Export failed:', error)
      toast.error(`Failed to export ${type.toUpperCase()}. Please try again.`, { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* Trigger Button (Light Theme) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        className={`
          inline-flex items-center gap-2
          rounded-lg
          bg-blue-600 hover:bg-blue-700
          text-white font-medium shadow-sm
          transition-all
          disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${focusRing}
        `}
        aria-label="Export options"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Download size={18} />
        <span>{label}</span>
        <ChevronDown 
          size={16} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu (Light Theme) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="
              absolute right-0 mt-1 w-56
              bg-white border border-gray-200
              rounded-lg shadow-lg
              overflow-hidden
              z-50
            "
            role="menu"
          >
            <div className="py-1">
              {/* CSV Option */}
              <button
                onClick={() => handleExport('csv')}
                className={`
                  w-full px-4 py-3
                  flex items-center gap-3
                  text-left
                  hover:bg-gray-50
                  transition-colors
                  ${focusRing}
                `}
                role="menuitem"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet size={18} className="text-emerald-600" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    Export as CSV
                  </div>
                  <div className="text-xs text-gray-500">
                    For Excel & data analysis
                  </div>
                </div>
              </button>

              {/* PDF Option */}
              {onExportPDF && (
                <button
                  onClick={() => handleExport('pdf')}
                  className={`
                    w-full px-4 py-3
                    flex items-center gap-3
                    text-left
                    hover:bg-gray-50
                    transition-colors
                    ${focusRing}
                  `}
                  role="menuitem"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-red-600" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      Export as PDF
                    </div>
                    <div className="text-xs text-gray-500">
                      For reports & presentations
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Footer Note */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Export includes current filter state
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

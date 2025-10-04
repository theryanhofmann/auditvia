'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, CheckCircle2, AlertTriangle, Github, TrendingUp, Info } from 'lucide-react'
import { focusRing } from './design-tokens'

export interface Notification {
  id: string
  type: 'success' | 'warning' | 'info' | 'github' | 'milestone'
  title: string
  message: string
  timestamp: Date
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationDrawerProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
  maxVisible?: number
}

const DISMISSED_KEY = 'auditvia_dismissed_notifications'

export function NotificationDrawer({ 
  notifications,
  onDismiss,
  maxVisible = 5 
}: NotificationDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  // Load dismissed from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem(DISMISSED_KEY)
    if (saved) {
      setDismissed(new Set(JSON.parse(saved)))
    }
  }, [])

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissed)
    newDismissed.add(id)
    setDismissed(newDismissed)
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...newDismissed]))
    onDismiss(id)
  }

  const activeNotifications = notifications
    .filter(n => !dismissed.has(n.id))
    .slice(0, maxVisible)

  const hasNotifications = activeNotifications.length > 0

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return CheckCircle2
      case 'warning': return AlertTriangle
      case 'github': return Github
      case 'milestone': return TrendingUp
      case 'info': return Info
      default: return Bell
    }
  }

  const getStyles = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          icon: 'text-emerald-600 bg-emerald-100',
        }
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          icon: 'text-amber-600 bg-amber-100',
        }
      case 'github':
        return {
          bg: 'bg-purple-50 border-purple-200',
          icon: 'text-purple-600 bg-purple-100',
        }
      case 'milestone':
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600 bg-blue-100',
        }
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-600 bg-gray-100',
        }
    }
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  if (!hasNotifications) return null

  return (
    <div className="fixed bottom-6 right-6 z-[1400] pointer-events-none">
      <div className="pointer-events-auto">
        {/* Toggle Button (Light Theme) */}
        {!isExpanded && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsExpanded(true)}
            className={`
              relative
              w-12 h-12 rounded-full
              bg-blue-600 hover:bg-blue-700
              shadow-lg hover:shadow-xl
              flex items-center justify-center
              transition-all
              ${focusRing}
            `}
            aria-label={`${activeNotifications.length} new notifications`}
          >
            <Bell size={20} className="text-white" />
            
            {/* Badge */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
              {activeNotifications.length}
            </div>
          </motion.button>
        )}

        {/* Drawer (Light Theme) */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-96 max-h-[600px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-blue-600" />
                  <h3 className="text-base font-semibold text-gray-900">
                    Notifications
                  </h3>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {activeNotifications.length}
                  </span>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className={`
                    p-1.5 rounded-lg hover:bg-gray-200
                    text-gray-500 hover:text-gray-700
                    transition-colors
                    ${focusRing}
                  `}
                  aria-label="Close notifications"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto max-h-[500px]">
                <AnimatePresence mode="popLayout">
                  {activeNotifications.map((notification, idx) => {
                    const Icon = getIcon(notification.type)
                    const styles = getStyles(notification.type)

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`
                          border-b border-gray-100 last:border-b-0
                          hover:bg-gray-50
                          transition-colors
                        `}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={`p-2 rounded-lg ${styles.icon} flex-shrink-0`}>
                              <Icon size={18} strokeWidth={2} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-gray-900">
                                  {notification.title}
                                </h4>
                                {notification.dismissible !== false && (
                                  <button
                                    onClick={() => handleDismiss(notification.id)}
                                    className={`
                                      p-1 rounded hover:bg-gray-100
                                      text-gray-400 hover:text-gray-600
                                      transition-colors flex-shrink-0
                                      ${focusRing}
                                    `}
                                    aria-label="Dismiss notification"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>

                              <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                                {notification.message}
                              </p>

                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {formatTimestamp(notification.timestamp)}
                                </span>

                                {notification.action && (
                                  <button
                                    onClick={notification.action.onClick}
                                    className={`
                                      text-xs font-medium text-blue-600 hover:text-blue-700
                                      transition-colors
                                      ${focusRing}
                                    `}
                                  >
                                    {notification.action.label}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Custom scrollbar styles (add to global CSS or use inline)
const _scrollbarStyles = `
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #475569;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
`

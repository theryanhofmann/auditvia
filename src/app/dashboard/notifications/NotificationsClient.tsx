'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  FileText,
  Settings as SettingsIcon,
  Award,
  Download,
  Check,
  Circle,
  MoreVertical,
  X,
  ExternalLink,
  Eye,
  Github,
  Play,
  Filter,
  XCircle,
  Loader2,
  Trash2,
  Volume2,
  VolumeX,
  Copy,
  ChevronRight
} from 'lucide-react'

// Type definitions
interface NotificationAction {
  type: 'route' | 'external' | 'verb'
  label: string
  href?: string
  verb?: string
  primary?: boolean
}

interface Notification {
  id: string
  type: 'scan' | 'violation' | 'fix' | 'ticket' | 'system' | 'milestone'
  title: string
  message: string
  severity?: 'critical' | 'serious' | 'moderate' | 'minor'
  site?: string
  siteUrl?: string
  rule?: string
  ruleDescription?: string
  scanId?: string
  scanDate?: string
  selector?: string
  impact?: {
    count?: number
    scoreDelta?: number
  }
  createdAt: string
  read: boolean
  actions: NotificationAction[]
  history?: Array<{
    timestamp: string
    event: string
  }>
}

// Type icons and colors
const typeConfig = {
  scan: {
    icon: FileText,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    label: 'Scan'
  },
  violation: {
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-50 border-red-200',
    label: 'Violation'
  },
  fix: {
    icon: CheckCircle2,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    label: 'Fix'
  },
  ticket: {
    icon: Github,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    label: 'Ticket'
  },
  system: {
    icon: SettingsIcon,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    label: 'System'
  },
  milestone: {
    icon: Award,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    label: 'Milestone'
  }
}

const severityConfig = {
  critical: { color: 'bg-red-500', label: 'Critical' },
  serious: { color: 'bg-orange-500', label: 'Serious' },
  moderate: { color: 'bg-amber-500', label: 'Moderate' },
  minor: { color: 'bg-blue-500', label: 'Minor' }
}

// Time ago helper
function timeAgo(date: string): string {
  const now = new Date()
  const past = new Date(date)
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NotificationsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get('id')
  )
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>(
    (searchParams.get('status') as any) || 'all'
  )
  const [typeFilters, setTypeFilters] = useState<Set<string>>(
    new Set(searchParams.get('types')?.split(',').filter(Boolean) || [])
  )
  const [severityFilters, setSeverityFilters] = useState<Set<string>>(
    new Set(searchParams.get('severity')?.split(',').filter(Boolean) || [])
  )
  const [dateRange, setDateRange] = useState(searchParams.get('range') || '30')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifications() {
      try {
        setLoading(true)
        const response = await fetch('/api/notifications')
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('[Notifications] API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          })
          throw new Error(`Failed to fetch notifications: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('[Notifications] Received data:', {
          total: data.total,
          unread: data.unread,
          notifications: data.notifications?.length
        })
        setNotifications(data.notifications || [])
      } catch (error) {
        console.error('[Notifications] Error:', error)
        // Show empty state instead of mock data
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (typeFilters.size > 0) params.set('types', Array.from(typeFilters).join(','))
    if (severityFilters.size > 0) params.set('severity', Array.from(severityFilters).join(','))
    if (dateRange !== '30') params.set('range', dateRange)
    if (selectedId) params.set('id', selectedId)
    
    const queryString = params.toString()
    router.replace(`/dashboard/notifications${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }, [searchQuery, statusFilter, typeFilters, severityFilters, dateRange, selectedId, router])

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchable = [
          notification.title,
          notification.message,
          notification.site,
          notification.rule
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!searchable.includes(query)) return false
      }

      // Status filter
      if (statusFilter === 'unread' && notification.read) return false
      if (statusFilter === 'read' && !notification.read) return false

      // Type filter
      if (typeFilters.size > 0 && !typeFilters.has(notification.type)) return false

      // Severity filter
      if (severityFilters.size > 0 && notification.severity && !severityFilters.has(notification.severity)) return false

      // Date range filter
      const daysPast = parseInt(dateRange)
      if (!isNaN(daysPast)) {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - daysPast)
        if (new Date(notification.createdAt) < cutoff) return false
      }

      return true
    })
  }, [notifications, searchQuery, statusFilter, typeFilters, severityFilters, dateRange])

  // Mark all as read
  const handleMarkAllRead = useCallback(async () => {
    const unreadIds = filteredNotifications.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length === 0) return

    // Optimistic update
    setNotifications(prev => prev.map(n => 
      unreadIds.includes(n.id) ? { ...n, read: true } : n
    ))

    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: unreadIds })
      })
    } catch (error) {
      // Revert on error
      setNotifications(prev => prev.map(n => 
        unreadIds.includes(n.id) ? { ...n, read: false } : n
      ))
    }
  }, [filteredNotifications])

  // Toggle read status
  const toggleRead = useCallback(async (id: string) => {
    const notification = notifications.find(n => n.id === id)
    if (!notification) return

    const newReadState = !notification.read

    // Optimistic update
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: newReadState } : n
    ))

    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], read: newReadState })
      })
    } catch (error) {
      // Revert on error
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: !newReadState } : n
      ))
    }
  }, [notifications])

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setTypeFilters(new Set())
    setSeverityFilters(new Set())
    setDateRange('30')
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilters.size > 0 || severityFilters.size > 0 || dateRange !== '30'
  const unreadCount = notifications.filter(n => !n.read).length
  const selectedNotification = notifications.find(n => n.id === selectedId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                Notifications
              </h1>
              <p className="text-sm text-gray-600">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleMarkAllRead}
                disabled={filteredNotifications.filter(n => !n.read).length === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4 inline mr-2" />
                Mark all read
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('unread')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === 'unread'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Unread
                </button>
                <button
                  onClick={() => setStatusFilter('read')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    statusFilter === 'read'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Read
                </button>
              </div>

              <div className="w-px h-6 bg-gray-200" />

              {/* Type filters */}
              {Object.entries(typeConfig).map(([type, config]) => {
                const isActive = typeFilters.has(type)
                return (
                  <button
                    key={type}
                    onClick={() => {
                      const newFilters = new Set(typeFilters)
                      if (isActive) newFilters.delete(type)
                      else newFilters.add(type)
                      setTypeFilters(newFilters)
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {config.label}
                  </button>
                )
              })}

              {hasActiveFilters && (
                <>
                  <div className="w-px h-6 bg-gray-200" />
                  <button
                    onClick={clearFilters}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Notification List */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Bell className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {hasActiveFilters ? 'No matching notifications' : "You're all caught up"}
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {hasActiveFilters ? 'Try adjusting your filters' : 'New activity will appear here when scans complete'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const config = typeConfig[notification.type]
                const Icon = config.icon
                const isSelected = selectedId === notification.id

                return (
                  <button
                    key={notification.id}
                    onClick={() => {
                      setSelectedId(notification.id)
                      if (!notification.read) {
                        toggleRead(notification.id)
                      }
                    }}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : notification.read
                        ? 'bg-white border-gray-200 hover:bg-gray-50 hover:shadow-sm'
                        : 'bg-white border-blue-200 hover:bg-blue-50/50 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          {notification.site && (
                            <span className="truncate">{notification.site}</span>
                          )}
                          {notification.severity && (
                            <>
                              <span>•</span>
                              <div className={`w-1.5 h-1.5 rounded-full ${severityConfig[notification.severity].color}`} />
                              <span className="capitalize">{notification.severity}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{timeAgo(notification.createdAt)}</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Details Panel */}
          <div className="lg:sticky lg:top-32 h-fit">
            {selectedNotification ? (
              <DetailPanel
                notification={selectedNotification}
                onClose={() => setSelectedId(null)}
                onToggleRead={() => toggleRead(selectedNotification.id)}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <Eye className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  Select a notification
                </h3>
                <p className="text-sm text-gray-600">
                  Choose a notification from the list to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Detail Panel Component
function DetailPanel({
  notification,
  onClose,
  onToggleRead
}: {
  notification: Notification
  onClose: () => void
  onToggleRead: () => void
}) {
  const config = typeConfig[notification.type]
  const Icon = config.icon

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${config.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {notification.title}
        </h2>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          {notification.severity && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
              notification.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
              notification.severity === 'serious' ? 'bg-orange-50 text-orange-700 border-orange-200' :
              notification.severity === 'moderate' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              {severityConfig[notification.severity].label}
            </span>
          )}
          <span>{timeAgo(notification.createdAt)}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Summary */}
        {notification.message && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">
              Summary
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {notification.message}
            </p>
          </div>
        )}

        {/* Context */}
        {(notification.site || notification.rule || notification.scanId) && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              Context
            </h3>
            <div className="space-y-2 text-sm">
              {notification.site && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 w-20">Site:</span>
                  <span className="text-gray-900 font-medium">{notification.site}</span>
                </div>
              )}
              {notification.rule && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 w-20 flex-shrink-0">Rule:</span>
                  <div>
                    <div className="text-gray-900 font-mono text-xs">{notification.rule}</div>
                    {notification.ruleDescription && (
                      <div className="text-gray-600 text-xs mt-1">{notification.ruleDescription}</div>
                    )}
                  </div>
                </div>
              )}
              {notification.selector && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 w-20 flex-shrink-0">Element:</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-900 font-mono">
                    {notification.selector}
                  </code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              Recommended Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              {notification.actions.slice(0, 4).map((action, idx) => (
                <button
                  key={idx}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    action.primary
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={onToggleRead}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Mark as {notification.read ? 'unread' : 'read'}
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Copy className="w-4 h-4 text-gray-500" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <VolumeX className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Mock data helper
function getMockNotifications(): Notification[] {
  return [
    {
      id: '1',
      type: 'violation',
      title: '1 new serious violation detected on auditvia.com',
      message: 'A serious accessibility violation was found during the latest scan.',
      severity: 'serious',
      site: 'auditvia.com',
      rule: 'aria-prohibited-attr',
      ruleDescription: 'Ensures ARIA attributes are not prohibited for an element\'s role',
      selector: 'div[role="button"]',
      createdAt: new Date(Date.now() - 300000).toISOString(),
      read: false,
      actions: [
        { type: 'route', label: 'View Violation', href: '/dashboard/violations', primary: true },
        { type: 'route', label: 'Create GitHub Issue', href: '#' }
      ]
    },
    {
      id: '2',
      type: 'scan',
      title: 'Scan completed: auditvia.com (12 issues found)',
      message: 'Your scheduled accessibility scan has completed. 12 issues were detected.',
      site: 'auditvia.com',
      scanId: 'scan_123',
      impact: { count: 12, scoreDelta: -3 },
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      read: false,
      actions: [
        { type: 'route', label: 'Open Report', href: '/dashboard/reports', primary: true },
        { type: 'route', label: 'Re-scan Site', href: '#' }
      ]
    },
    {
      id: '3',
      type: 'fix',
      title: 'Issue resolved: color-contrast on /pricing',
      message: 'The color contrast issue on your pricing page has been fixed.',
      severity: 'moderate',
      site: 'auditvia.com',
      rule: 'color-contrast',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      read: true,
      actions: [
        { type: 'route', label: 'View Change', href: '#' }
      ]
    }
  ]
}


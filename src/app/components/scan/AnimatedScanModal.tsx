'use client'

import { useEffect, useState } from 'react'
import { X, Check, AlertTriangle, XCircle, ChevronDown, ChevronUp, Eye, Hand, Brain, Ear } from 'lucide-react'

interface ScanIssue {
  id: number
  rule: string
  selector: string
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string | null
  help_url: string | null
  html: string | null
}

interface IssueCategory {
  id: string
  name: string
  score: number
  issues: ScanIssue[]
  passedCount: number
  failedCount: number
}

interface AnimatedScanModalProps {
  isOpen: boolean
  siteUrl: string
  siteName?: string
  siteScreenshot?: string // base64 screenshot from scan
  onClose: () => void
  onAskAI?: () => void
  scanId?: string
  teamId?: string
  siteId?: string
  mode?: 'founder' | 'developer'
}

// Map WCAG rules to user-friendly titles and affected users
const RULE_CONFIG: Record<string, {
  title: string
  category: string
  affectedUsers: ('motor' | 'vision' | 'cognitive' | 'hearing')[]
}> = {
  'button-name': {
    title: 'Buttons must have accessible names',
    category: 'Clickables',
    affectedUsers: ['motor', 'vision']
  },
  'link-name': {
    title: 'Links must have accessible names',
    category: 'Clickables',
    affectedUsers: ['motor', 'vision']
  },
  'image-alt': {
    title: 'Images must have alt text',
    category: 'Graphics',
    affectedUsers: ['vision']
  },
  'color-contrast': {
    title: 'Text must have sufficient color contrast',
    category: 'Contrast',
    affectedUsers: ['vision']
  },
  'heading-order': {
    title: 'Headings must be in logical order',
    category: 'Titles',
    affectedUsers: ['vision', 'cognitive']
  },
  'page-has-heading-one': {
    title: 'Pages must have an H1 heading',
    category: 'Titles',
    affectedUsers: ['vision', 'cognitive']
  },
  'html-has-lang': {
    title: 'HTML must have a lang attribute',
    category: 'General',
    affectedUsers: ['vision', 'cognitive']
  },
  'label': {
    title: 'Form inputs must have labels',
    category: 'Forms',
    affectedUsers: ['motor', 'vision']
  },
  'aria-roles': {
    title: 'ARIA roles must be used correctly',
    category: 'General',
    affectedUsers: ['motor', 'vision', 'cognitive']
  },
  'list': {
    title: 'Lists must be properly structured',
    category: 'General',
    affectedUsers: ['vision', 'cognitive']
  },
  'meta-viewport': {
    title: 'Viewport must allow zoom',
    category: 'Orientation',
    affectedUsers: ['vision', 'motor']
  },
  'tabindex': {
    title: 'Tab order must be logical',
    category: 'Clickables',
    affectedUsers: ['motor', 'vision']
  },
  'landmark-one-main': {
    title: 'Page must have main landmark',
    category: 'General',
    affectedUsers: ['vision', 'cognitive']
  }
}

const AFFECTED_USER_CONFIG = {
  motor: { icon: Hand, label: 'Motor Impaired', color: 'bg-blue-100 text-blue-700' },
  vision: { icon: Eye, label: 'Vision Impaired', color: 'bg-purple-100 text-purple-700' },
  cognitive: { icon: Brain, label: 'Cognitive Disability', color: 'bg-orange-100 text-orange-700' },
  hearing: { icon: Ear, label: 'Hearing Impaired', color: 'bg-green-100 text-green-700' }
}

export function AnimatedScanModal({ 
  isOpen, 
  siteUrl, 
  siteName,
  siteScreenshot,
  onClose,
  onAskAI,
  scanId,
  teamId,
  siteId,
  mode = 'founder'
}: AnimatedScanModalProps) {
  const [isScanning, setIsScanning] = useState(true)
  const [scanProgress, setScanProgress] = useState(0)
  const [verdict, setVerdict] = useState<'compliant' | 'at-risk' | 'non-compliant' | null>(null)
  const [totalIssues, setTotalIssues] = useState(0)
  const [categories, setCategories] = useState<IssueCategory[]>([])
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!isOpen || !scanId) return

    // Simulate scanning progress
    setIsScanning(true)
    setScanProgress(0)
    
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 400)

    let pollInterval: NodeJS.Timeout | null = null

    // Poll for scan completion
    const checkScanStatus = async () => {
      try {
        const response = await fetch(`/api/scans/${scanId}/issues`)
        
        // If we get a successful response with issues, the scan is complete
        if (response.ok) {
          const data = await response.json()
          
          // Check if scan is actually complete (has issues or totalIssues is 0)
          if (data.issues !== undefined && data.totalIssues !== undefined) {
            console.log('✅ [AnimatedScanModal] Scan completed, processing results...')
            
            // Stop polling
            if (pollInterval) clearInterval(pollInterval)
            clearInterval(progressInterval)
            
            // Process issues into categories
            const issuesByCategory = processIssuesIntoCategories(data.issues || [])
            setCategories(issuesByCategory)
            
            const total = data.totalIssues || 0
            setTotalIssues(total)
            
            // Determine verdict
            const criticalCount = data.issues?.filter((i: ScanIssue) => i.severity === 'critical' || i.severity === 'serious').length || 0
            if (total === 0) {
              setVerdict('compliant')
            } else if (criticalCount > 0) {
              setVerdict('non-compliant')
            } else {
              setVerdict('at-risk')
            }
            
            setScanProgress(100)
            setIsScanning(false)
          } else {
            console.log('🔄 [AnimatedScanModal] Scan still running, polling...')
          }
        } else {
          console.log('🔄 [AnimatedScanModal] Scan not ready yet, status:', response.status)
        }
      } catch (error) {
        console.error('❌ [AnimatedScanModal] Error checking scan status:', error)
      }
    }

    // Start polling after initial delay
    setTimeout(() => {
      checkScanStatus() // Check immediately
      pollInterval = setInterval(checkScanStatus, 2000) // Then poll every 2 seconds
    }, 2000)

    return () => {
      clearInterval(progressInterval)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [isOpen, scanId])

  const processIssuesIntoCategories = (issues: ScanIssue[]): IssueCategory[] => {
    const categoryMap = new Map<string, IssueCategory>()
    
    issues.forEach(issue => {
      const config = RULE_CONFIG[issue.rule] || {
        title: issue.rule,
        category: 'General',
        affectedUsers: []
      }
      
      const categoryName = config.category
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          id: categoryName.toLowerCase(),
          name: categoryName,
          score: 100,
          issues: [],
          passedCount: 0,
          failedCount: 0
        })
      }
      
      const category = categoryMap.get(categoryName)!
      category.issues.push(issue)
      category.failedCount++
    })
    
    // Calculate scores (simplified)
    categoryMap.forEach(category => {
      const totalTests = category.passedCount + category.failedCount
      if (totalTests > 0) {
        category.score = Math.round((category.passedCount / totalTests) * 100)
      }
    })
    
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  const toggleIssue = (issueId: number) => {
    setExpandedIssues(prev => {
      const next = new Set(prev)
      if (next.has(issueId)) {
        next.delete(issueId)
      } else {
        next.add(issueId)
      }
      return next
    })
  }

  const getIssueTitle = (issue: ScanIssue): string => {
    const config = RULE_CONFIG[issue.rule]
    if (config) return config.title
    
    // Fallback: clean up the description or rule name
    if (issue.description && issue.description.length < 80) {
      return issue.description
    }
    return issue.rule.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const getAffectedUsers = (issue: ScanIssue): ('motor' | 'vision' | 'cognitive' | 'hearing')[] => {
    const config = RULE_CONFIG[issue.rule]
    return config?.affectedUsers || ['vision']
  }

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-50 border-red-200',
      serious: 'bg-orange-50 border-orange-200',
      moderate: 'bg-yellow-50 border-yellow-200',
      minor: 'bg-gray-50 border-gray-200'
    }
    return colors[severity as keyof typeof colors] || colors.minor
  }

  const getSeverityBadgeColor = (severity: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-700',
      serious: 'bg-orange-100 text-orange-700',
      moderate: 'bg-yellow-100 text-yellow-700',
      minor: 'bg-gray-100 text-gray-700'
    }
    return colors[severity as keyof typeof colors] || colors.minor
  }

  if (!isOpen) return null

  const verdictConfig = {
    'compliant': {
      icon: Check,
      text: 'Compliant',
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      description: 'Your scan indicates no major accessibility issues'
    },
    'at-risk': {
      icon: AlertTriangle,
      text: 'At Risk',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      iconBg: 'bg-orange-100',
      description: 'Minor accessibility issues detected that should be addressed'
    },
    'non-compliant': {
      icon: XCircle,
      text: 'Non-compliant',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconBg: 'bg-red-100',
      description: 'Your scan indicates serious accessibility issues on your webpage. Make your website accessible and ADA compliant to mitigate legal risks now.'
    }
  }

  const currentVerdict = verdict ? verdictConfig[verdict] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">A</span>
              </div>
              <div>
                <h2 className="text-white font-semibold text-base">Auditvia</h2>
                <p className="text-blue-200 text-sm">Enterprise Accessibility Scanner</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-blue-200 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Site URL */}
          <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
            <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {siteName ? siteName.charAt(0).toUpperCase() : 'S'}
              </span>
            </div>
            <span className="text-sm text-white truncate">{siteUrl}</span>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {isScanning ? (
            /* Scanning State with Website Preview */
            <div className="text-center">
              {/* Status Text */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Scanning your website...</h3>
                <p className="text-gray-600">Evaluating accessibility requirements across multiple pages</p>
              </div>

              {/* Website Preview with Scanning Animation */}
              <div className="relative max-w-4xl mx-auto mb-6">
                {/* Browser Chrome */}
                <div className="bg-gray-100 rounded-t-lg px-3 py-2 flex items-center gap-2 border-b border-gray-300">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  <div className="flex-1 bg-white rounded px-2 py-0.5 text-xs text-gray-500 truncate">
                    {siteUrl}
                  </div>
                </div>

                {/* Website Screenshot Container */}
                <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-b-lg overflow-hidden border-x border-b border-gray-300" style={{ height: '400px' }}>
                  {/* Use real screenshot from scan if available */}
                  {siteScreenshot ? (
                    <img
                      src={siteScreenshot}
                      alt="Website preview"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    /* Iframe fallback - shows real website during scan */
                    <iframe
                      src={siteUrl}
                      className="w-full h-full pointer-events-none"
                      sandbox="allow-same-origin allow-scripts"
                      title="Website preview"
                      style={{ border: 'none' }}
                    />
                  )}
                  
                  {/* Enhanced Mockup Fallback - Always shows nice preview */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50">
                    {/* Mockup Website Content */}
                    <div className="w-full h-full p-8 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                            <span className="text-white font-bold text-xl">
                              {siteName ? siteName.charAt(0).toUpperCase() : new URL(siteUrl).hostname.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="h-4 w-32 bg-gray-300 rounded animate-pulse"></div>
                            <div className="h-3 w-24 bg-gray-200 rounded mt-1.5 animate-pulse"></div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-20 h-9 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-20 h-9 bg-blue-600 rounded shadow-sm"></div>
                        </div>
                      </div>
                      
                      {/* Hero Section */}
                      <div className="space-y-3 pt-6">
                        <div className="h-8 w-3/4 bg-gray-300 rounded animate-pulse"></div>
                        <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-5 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                        <div className="flex gap-3 mt-6">
                          <div className="w-28 h-11 bg-blue-600 rounded shadow-sm"></div>
                          <div className="w-28 h-11 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>

                      {/* Content Cards */}
                      <div className="grid grid-cols-3 gap-4 pt-8">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm space-y-2">
                            <div className="w-full h-24 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 w-full bg-gray-300 rounded animate-pulse"></div>
                            <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        ))}
                      </div>

                      {/* Scanning Indicator Badge */}
                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-blue-500">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <div>
                          <div className="text-sm font-semibold">Analyzing Website</div>
                          <div className="text-xs text-blue-100">{new URL(siteUrl).hostname}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scanning Overlay with CSS Animation */}
                  <div className="absolute inset-0 bg-blue-600/5 pointer-events-none">
                    {/* Animated Scanning Line - Seamless Loop */}
                    <style jsx>{`
                      @keyframes scan-vertical {
                        0% {
                          top: -10%;
                        }
                        100% {
                          top: 110%;
                        }
                      }
                      .scan-line {
                        animation: scan-vertical 3s ease-in-out infinite;
                      }
                    `}</style>
                    <div className="scan-line absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-blue-500/40 to-transparent"
                      style={{
                        boxShadow: '0 0 60px rgba(59, 130, 246, 0.6)',
                      }}
                    >
                      {/* Horizontal scan line */}
                      <div className="absolute left-0 right-0 top-1/2 h-1 bg-blue-500 shadow-xl" 
                        style={{
                          boxShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4)'
                        }}
                      />
                    </div>

                    {/* Grid Overlay for Tech Feel */}
                    <div className="absolute inset-0 opacity-20" 
                      style={{
                        backgroundImage: `
                          linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                      }}
                    />

                    {/* Scanning Points with Staggered Animation */}
                    <style jsx>{`
                      @keyframes scan-point {
                        0%, 100% {
                          opacity: 0;
                          transform: scale(0.5);
                        }
                        50% {
                          opacity: 1;
                          transform: scale(1.5);
                        }
                      }
                      .scan-point {
                        animation: scan-point 2s ease-in-out infinite;
                      }
                    `}</style>
                    <div className="absolute inset-0">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="scan-point absolute w-3 h-3 bg-blue-400 rounded-full"
                          style={{
                            left: `${5 + (i * 8)}%`,
                            top: `${15 + (i * 6) % 70}%`,
                            animationDelay: `${i * 200}ms`,
                            boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)'
                          }}
                        />
                      ))}
                    </div>

                    {/* Corner Scan Indicators */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-blue-500 opacity-60" />
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-blue-500 opacity-60" />
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-blue-500 opacity-60" />
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-blue-500 opacity-60" />
                  </div>

                  {/* Progress Badge */}
                  <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium text-gray-900">{scanProgress}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Deep Scan</p>
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="max-w-md mx-auto">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300 ease-out"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Scanning pages and states...
                </p>
              </div>
            </div>
          ) : (
            /* Results State */
            <>
              {/* Verdict Banner */}
              {currentVerdict && (
                <div className={`
                  rounded-lg px-4 py-4 flex items-start gap-3 mb-6
                  ${currentVerdict.bg} ${currentVerdict.border} border
                `}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${currentVerdict.iconBg}`}>
                    <currentVerdict.icon className={`w-5 h-5 ${currentVerdict.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {currentVerdict.text}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {currentVerdict.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Summary */}
              <p className="text-gray-700 mb-4">
                We found <span className="font-semibold">{totalIssues} accessibility {totalIssues === 1 ? 'issue' : 'issues'}</span> on {siteUrl}
              </p>

              {/* Standards Badges */}
              <div className="flex items-center gap-2 mb-6">
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  WCAG 2.2 Level AA
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  ADA Compliant
                </span>
              </div>

              {/* Main CTA - View Full Report */}
              <div className="mb-8">
                <button 
                  type="button"
                  onClick={() => {
                    if (scanId) window.location.href = `/dashboard/scans/${scanId}`
                  }}
                  className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  View Full Report
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  See detailed breakdown, remediation steps, and more
                </p>
              </div>

              {/* Issue Categories */}
              <div className="space-y-6">
                {categories.map(category => (
                  <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-gray-900">{category.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        category.score >= 90 ? 'bg-green-100 text-green-700' :
                        category.score >= 70 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        Score: {category.score}
                      </span>
                    </div>

                    {/* Issues List */}
                    <div className="divide-y divide-gray-100">
                      {category.issues.map((issue, idx) => {
                        const isExpanded = expandedIssues.has(issue.id)
                        const affectedUsers = getAffectedUsers(issue)
                        
                        return (
                          <div key={issue.id} className="bg-white">
                            {/* Issue Row */}
                            <div 
                              className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
                              onClick={() => toggleIssue(issue.id)}
                            >
                              {/* Severity Icon */}
                              <div className="flex-shrink-0">
                                {issue.severity === 'critical' || issue.severity === 'serious' ? (
                                  <XCircle className="w-5 h-5 text-red-500" />
                                ) : issue.severity === 'moderate' ? (
                                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-gray-400" />
                                )}
                              </div>

                              {/* Title */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {getIssueTitle(issue)}
                                </p>
                              </div>

                              {/* Affected Users Badges */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {affectedUsers.map(userType => {
                                  const config = AFFECTED_USER_CONFIG[userType]
                                  return (
                                    <div 
                                      key={userType}
                                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}
                                      title={config.label}
                                    >
                                      <config.icon className="w-3 h-3" />
                                      <span className="hidden sm:inline">{config.label}</span>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Expand Icon */}
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              )}
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 space-y-4">
                                {/* Description */}
                                {issue.description && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-700 mb-2">Requirement:</h5>
                                    <p className="text-sm text-gray-700">{issue.description}</p>
                                  </div>
                                )}

                                {/* Code Snippet */}
                                {issue.html && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-700 mb-2">
                                      Code snapshot of failed element
                                    </h5>
                                    <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                                      <code className="text-xs text-white font-mono">
                                        {issue.html}
                                      </code>
                                    </div>
                                  </div>
                                )}

                                {/* Selector */}
                                {issue.selector && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-700 mb-1">Element:</h5>
                                    <code className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                      {issue.selector}
                                    </code>
                                  </div>
                                )}

                                {/* Help Link */}
                                {issue.help_url && (
                                  <div>
                                    <a 
                                      href={issue.help_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                                    >
                                      Learn how to fix this issue →
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Secondary CTA - after scrolling through issues */}
              {categories.length > 0 && (
                <div className="mt-8">
                  <button
                    type="button"
                    onClick={() => {
                      if (scanId) window.location.href = `/dashboard/scans/${scanId}`
                    }}
                    className="w-full px-6 py-3 bg-white hover:bg-gray-50 border-2 border-blue-600 text-blue-600 text-base font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    View Full Report & Get Remediation Steps
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

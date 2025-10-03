'use client'

import { useState } from 'react'
import { 
  X, 
  Code, 
  User, 
  ExternalLink, 
  Copy, 
  Check,
  Github,
  FileText,
  AlertCircle,
  Mail,
  Sparkles
} from 'lucide-react'

interface IssueDetailPanelProps {
  issue: any
  isOpen: boolean
  onClose: () => void
  onOpenAI?: (prefillData: any) => void
  onEmailDesigner?: (issue: any) => void
  mode?: 'founder' | 'developer'
  teamId?: string
  scanId?: string
  siteUrl?: string
  siteName?: string
  platform?: string
}

export function IssueDetailPanel({ 
  issue, 
  isOpen, 
  onClose,
  onOpenAI,
  onEmailDesigner,
  mode: initialMode = 'founder',
  teamId,
  scanId,
  siteUrl,
  siteName,
  platform
}: IssueDetailPanelProps) {
  const [mode, setMode] = useState<'founder' | 'developer'>(initialMode)
  const [copied, setCopied] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)

  if (!isOpen || !issue) return null

  console.log('🔍 [IssueDetailPanel] RENDERING:', {
    issueId: issue.id,
    description: issue.description,
    impact: issue.impact,
    mode,
    isOpen
  })

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Extract WCAG references
  const wcagTags = issue.wcag || issue.tags?.filter((t: string) => t.startsWith('wcag')) || []

  // Founder mode content
  const founderExplanation = getFounderExplanation(issue)
  const founderSteps = getFounderSteps(issue)

  // Developer mode content
  const codeSnippet = getCodeSnippet(issue)
  const selector = issue.target?.[0] || issue.selector || 'Element selector not available'

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto"
        data-testid="issue-detail"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`
                  px-2 py-1 rounded text-xs font-semibold uppercase
                  ${issue.impact === 'critical' ? 'bg-red-100 text-red-700' : ''}
                  ${issue.impact === 'serious' ? 'bg-orange-100 text-orange-700' : ''}
                  ${issue.impact === 'moderate' ? 'bg-yellow-100 text-yellow-700' : ''}
                  ${issue.impact === 'minor' ? 'bg-blue-100 text-blue-700' : ''}
                `}>
                  {issue.impact} Impact
                </span>
                {wcagTags.map((tag: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                {issue.description || issue.help || 'Accessibility Issue'}
              </h2>
              
              {/* Page URL and State context */}
              {(issue.page_url || issue.page_state) && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Found on:</span>
                  {issue.page_url && siteUrl && issue.page_url !== siteUrl && (
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {new URL(issue.page_url).pathname || '/'}
                    </span>
                  )}
                  {issue.page_state && issue.page_state !== 'default' && issue.page_state !== 'initial_load' && (
                    <>
                      <span className="text-gray-400">→</span>
                      <span className="italic text-gray-700 bg-gray-100 px-2 py-0.5 rounded capitalize">
                        {issue.page_state.replace(/_/g, ' ')}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="inline-flex rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setMode('founder')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${mode === 'founder' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              <User className="w-4 h-4" />
              Founder Mode
            </button>
            <button
              onClick={() => setMode('developer')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${mode === 'developer' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
                }
              `}
            >
              <Code className="w-4 h-4" />
              Developer Mode
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {mode === 'founder' ? (
            /* FOUNDER MODE */
            <div className="space-y-8">
              {/* What This Means */}
              <section>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">What This Means</h3>
                <p className="text-slate-700 leading-relaxed">
                  {founderExplanation}
                </p>
              </section>

              {/* Who It Affects */}
              <section>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Who It Affects</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-900 mb-3">
                    This issue creates barriers for people with:
                  </p>
                  <ul className="space-y-2">
                    {getAffectedUsers(issue).map((user, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-blue-800">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{user}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* How to Fix */}
              <section>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">How to Fix It</h3>
                <div className="space-y-3">
                  {founderSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-slate-700">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Try This in Your Builder - Platform-Specific */}
              <section>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  {platform ? `Fix This in ${platform.charAt(0).toUpperCase() + platform.slice(1)}` : 'Try This in Your Builder'}
                </h3>
                <div className="space-y-4">
                  {(!platform || platform === 'webflow') && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">W</span>
                        Webflow
                      </h4>
                      <p className="text-slate-700 text-sm">
                        Select the element → Settings → add a descriptive Label (e.g., aria-label) or use a labeled component.
                      </p>
                    </div>
                  )}

                  {(!platform || platform === 'wordpress') && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">WP</span>
                        WordPress
                      </h4>
                      <p className="text-slate-700 text-sm">
                        Use a block with a Label setting; avoid empty buttons/links; set Alt Text for images.
                      </p>
                    </div>
                  )}

                  {(!platform || platform === 'framer') && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">F</span>
                        Framer
                      </h4>
                      <p className="text-slate-700 text-sm">
                        Use a Button component with a 'Label'; avoid icons without text.
                      </p>
                    </div>
                  )}
                  
                  {platform && !['webflow', 'wordpress', 'framer'].includes(platform) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 mb-2">
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </h4>
                      <p className="text-slate-700 text-sm">
                        Add semantic labels and ARIA attributes to your elements to improve accessibility.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Platform-Specific Guides (SMB Actions) */}
              <section data-testid="actions-founder">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">
                  {platform ? `Get ${platform.charAt(0).toUpperCase() + platform.slice(1)} Help` : 'Get Help for Your Platform'}
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  {platform 
                    ? `Get step-by-step instructions for fixing this in ${platform.charAt(0).toUpperCase() + platform.slice(1)}:`
                    : 'Click below to get step-by-step instructions for your website builder:'}
                </p>
                <div className={`grid ${platform ? 'grid-cols-1' : 'grid-cols-3'} gap-3 mb-4`}>
                  {(platform 
                    ? [platform.charAt(0).toUpperCase() + platform.slice(1)] 
                    : ['Webflow', 'WordPress', 'Framer']
                  ).map((platformName) => (
                    <button
                      key={platformName}
                      onClick={() => {
                        const prefillData = {
                          platform: platformName,
                          ruleId: issue.id || issue.rule_id,
                          ruleTitle: issue.description || issue.help,
                          impact: getFounderExplanation(issue),
                          wcag: issue.wcag?.[0] || 'WCAG 2.2 AA',
                          pageUrl: siteUrl,
                          siteName
                        }
                        onOpenAI?.(prefillData)
                        
                        // Track analytics
                        if (typeof window !== 'undefined' && (window as any).analytics) {
                          (window as any).analytics.track('issue_action_clicked', {
                            action: 'platform_guide',
                            platform: platformName.toLowerCase(),
                            issueId: issue.id,
                            rule: issue.id || issue.rule_id,
                            teamId,
                            scanId
                          })
                        }
                        console.log('🎯 [Platform Guide]', { platform: platformName, issue: issue.id })
                      }}
                      className="flex flex-col items-center gap-2 px-4 py-3 border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-slate-700">{platformName}</span>
                    </button>
                  ))}
                </div>

                {/* Email to Designer */}
                <button
                  onClick={() => {
                    setShowEmailModal(true)
                    // Track analytics
                    if (typeof window !== 'undefined' && (window as any).analytics) {
                      (window as any).analytics.track('issue_action_clicked', {
                        action: 'email_designer_opened',
                        issueId: issue.id,
                        teamId,
                        scanId
                      })
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Email This to My Designer
                </button>
              </section>

              {/* Learn More */}
              {issue.helpUrl && (
                <section>
                  <a
                    href={issue.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    Learn more about this rule
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </section>
              )}
            </div>
          ) : (
            /* DEVELOPER MODE */
            <div className="space-y-8">
              {/* Technical Details */}
              <section>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Technical Details</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-slate-500 mb-1">Rule ID</dt>
                    <dd className="text-slate-900 font-mono text-sm">{issue.id || issue.rule_id || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500 mb-1">Impact</dt>
                    <dd className="text-slate-900 capitalize">{issue.impact}</dd>
                  </div>
                  {wcagTags.length > 0 && (
                    <div>
                      <dt className="text-sm font-medium text-slate-500 mb-1">WCAG Criteria</dt>
                      <dd className="flex flex-wrap gap-2">
                        {wcagTags.map((tag: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-slate-100 rounded text-sm font-mono">
                            {tag}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* CSS Selector */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-900">CSS Selector</h3>
                  <button
                    onClick={() => handleCopy(selector)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                  <code className="text-sm text-green-400 font-mono whitespace-pre">
                    {selector}
                  </code>
                </div>
              </section>

              {/* Code Snippet */}
              {codeSnippet && (
                <section>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Suggested Fix</h3>
                  <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-slate-100 font-mono">
                      <code>{codeSnippet}</code>
                    </pre>
                  </div>
                </section>
              )}

              {/* Actions */}
              <section>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Actions</h3>
                <div className="flex flex-col gap-3">
                  <button className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors">
                    <Github className="w-5 h-5" />
                    Create GitHub Issue
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg font-medium transition-colors">
                    <FileText className="w-5 h-5" />
                    Export to Markdown
                  </button>
                </div>
              </section>

              {/* Documentation */}
              {issue.helpUrl && (
                <section>
                  <a
                    href={issue.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View full documentation
                  </a>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Email Designer Modal */}
      {showEmailModal && (
        <EmailDesignerModal
          issue={issue}
          siteUrl={siteUrl || ''}
          siteName={siteName || ''}
          onClose={() => setShowEmailModal(false)}
          teamId={teamId}
          scanId={scanId}
        />
      )}
    </>
  )
}

// Email Designer Modal Component
function EmailDesignerModal({
  issue,
  siteUrl,
  siteName,
  onClose,
  teamId,
  scanId
}: {
  issue: any
  siteUrl: string
  siteName: string
  onClose: () => void
  teamId?: string
  scanId?: string
}) {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [emailError, setEmailError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setSending(true)
    setEmailError('')

    try {
      const response = await fetch('/api/email/send-remediation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: email,
          note,
          siteName,
          pageUrl: siteUrl,
          issueShort: issue.description || issue.help,
          impactPlain: getFounderExplanation(issue),
          wcagRef: issue.wcag?.[0] || 'WCAG 2.2 AA',
          founderHowTo: getFounderSteps(issue).join('\n'),
          developerNotes: issue.target?.[0] || issue.selector,
          reportLink: `${window.location.origin}/dashboard/scans/${scanId}`,
          teamId,
          scanId,
          issueId: issue.id
        })
      })

      if (response.ok) {
        // Track analytics
        const emailDomain = email.split('@')[1]
        if (typeof window !== 'undefined' && (window as any).analytics) {
          (window as any).analytics.track('email_sent_to_designer', {
            toEmailDomain: emailDomain,
            issueId: issue.id,
            teamId,
            scanId
          })
        }
        console.log('📧 [Email Sent]', { domain: emailDomain, issue: issue.id })

        // Show success toast
        const toast = document.createElement('div')
        toast.className = 'fixed top-4 right-4 z-50 px-6 py-4 bg-green-600 text-white rounded-lg shadow-lg'
        toast.textContent = `✓ Sent to ${email}`
        document.body.appendChild(toast)
        setTimeout(() => toast.remove(), 3000)

        onClose()
      } else {
        setEmailError('Failed to send email. Please try again.')
      }
    } catch (error) {
      console.error('Email send error:', error)
      setEmailError('Failed to send email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-xl shadow-2xl z-50 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Email to Designer</h3>
            <p className="text-sm text-slate-600 mt-1">
              Send a detailed fix guide for this accessibility issue
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Designer's Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError('')
              }}
              placeholder="designer@example.com"
              className={`
                w-full px-4 py-3 border-2 rounded-lg transition-colors
                ${emailError ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}
                focus:outline-none
              `}
              required
            />
            {emailError && (
              <p className="mt-2 text-sm text-red-600">{emailError}</p>
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Add a Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any additional context for your designer..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-slate-200 focus:border-blue-500 focus:outline-none rounded-lg transition-colors resize-none"
            />
          </div>

          {/* Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Email Preview:</p>
            <div className="text-sm text-slate-600 space-y-1">
              <p><strong>Subject:</strong> Auditvia – Fix for {siteUrl} — {issue.description}</p>
              <p><strong>Issue:</strong> {issue.description}</p>
              <p><strong>Impact:</strong> {getFounderExplanation(issue).substring(0, 100)}...</p>
              <p><strong>WCAG:</strong> {issue.wcag?.[0] || 'WCAG 2.2 AA'}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// Helper functions for founder mode - EXACT VERBATIM FROM SPEC
function getFounderExplanation(issue: any): string {
  // Spec text: "This element is not accessible to screen readers. A blind user may miss key information."
  return 'This element is not accessible to screen readers. A blind user may miss key information.'
}

function getFounderSteps(issue: any): string[] {
  // Spec text: "Add a text label that explains this element. If it's decorative, hide it from assistive tech."
  return [
    'Add a text label that explains this element. If it\'s decorative, hide it from assistive tech.'
  ]
}

function getAffectedUsers(issue: any): string[] {
  // Spec text: "Blind/low-vision users; keyboard-only users."
  return [
    'Blind/low-vision users',
    'Keyboard-only users'
  ]
}

function getCodeSnippet(issue: any): string | null {
  // Ensure ruleId is always a string (same fix as in verdict-system.ts)
  const ruleId = String(issue.id || issue.rule_id || '').toLowerCase()
  
  if (ruleId.includes('button-name')) {
    return `<!-- Before -->\n<button></button>\n\n<!-- After -->\n<button>Submit Form</button>\n\n<!-- Or for icon buttons -->\n<button aria-label="Close menu">\n  <Icon />\n</button>`
  }
  if (ruleId.includes('color-contrast')) {
    return `/* Before */\ncolor: #999;\nbackground: #fff;\n\n/* After - meets WCAG AA */\ncolor: #333;\nbackground: #fff;\n/* Contrast ratio: 12.6:1 */`
  }
  if (ruleId.includes('image-alt')) {
    return `<!-- Before -->\n<img src="logo.png">\n\n<!-- After -->\n<img src="logo.png" alt="Company name logo">\n\n<!-- Decorative image -->\n<img src="divider.png" alt="">`
  }
  
  return null
}


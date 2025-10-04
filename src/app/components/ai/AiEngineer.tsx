'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, 
  Send, 
  Sparkles, 
  Code, 
  User,
  Mail,
  ExternalLink,
  FileText,
  Github,
  Loader2,
  AlertTriangle,
  type LucideIcon
} from 'lucide-react'

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, LucideIcon> = {
  Github,
  Mail,
  Code,
  FileText,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  X
}

interface AiEngineerProps {
  scanId: string
  teamId: string
  siteUrl: string
  siteName: string
  verdict: 'compliant' | 'at-risk' | 'non-compliant'
  categories: any[]
  topIssues: any[]
  autoOpen?: boolean
  mode?: 'founder' | 'developer'
  platform?: string
  platformConfidence?: number
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  actions?: {
    label: string
    action: string
    icon?: string | LucideIcon  // Can be icon name string or component
  }[]
}

export function AiEngineer({
  scanId,
  teamId,
  siteUrl,
  siteName,
  verdict,
  categories,
  topIssues,
  autoOpen = false,
  mode: initialMode = 'founder',
  platform,
  platformConfidence
}: AiEngineerProps) {
  console.log('🤖 [AiEngineer] RENDERING:', {
    scanId,
    verdict,
    categoriesCount: categories.length,
    topIssuesCount: topIssues.length,
    autoOpen,
    mode: initialMode
  })

  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'founder' | 'developer'>(initialMode)
  const [showContactForm, setShowContactForm] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-open logic
  useEffect(() => {
    if (autoOpen && (verdict === 'non-compliant' || verdict === 'at-risk')) {
      setTimeout(() => {
        setIsOpen(true)
        setIsMinimized(false)
        
        // Send initial greeting
        const greeting = mode === 'founder'
          ? `Hi! I'm your Auditvia AI Engineer. I noticed your site has some accessibility issues. I can help you understand them and fix them — no coding required! What would you like to know?`
          : `AI Engineer ready. I've analyzed your scan results. I can help you understand violations, generate code fixes, or create GitHub issues. How can I assist?`
        
        // Create platform-specific action label
        const platformName = platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : 'your builder'
        const platformGuideAction = platform ? `${platform}-guide` : 'platform-guide'

        setMessages([{
          id: '1',
          role: 'assistant',
          content: greeting,
          actions: mode === 'founder' ? [
            { label: 'What are my biggest issues?', action: 'top-issues', icon: FileText },
            { label: `How do I fix these in ${platformName}?`, action: platformGuideAction, icon: Code },
            { label: 'Email this to my designer', action: 'email-designer', icon: Mail }
          ] : [
            { label: 'Show top violations', action: 'top-issues', icon: FileText },
            { label: 'Generate GitHub issues', action: 'github-bulk', icon: Github },
            { label: 'Export code snippets', action: 'export-code', icon: Code }
          ]
        }])

        // Track analytics
        trackEvent('ai_opened', {
          teamId,
          scanId,
          verdict,
          mode,
          trigger: 'auto'
        })
      }, 2000)
    }
  }, [autoOpen, verdict, mode, teamId, scanId, platform])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Track prompt
    trackEvent('ai_prompt_sent', {
      teamId,
      scanId,
      mode,
      promptLength: input.length
    })

    try {
      console.log('💬 [AI Engineer] Sending message:', {
        messageLength: input.length,
        historyLength: messages.length,
        mode
      })

      // Build conversation history (last 5 exchanges to maintain context)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      // Call AI API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: {
            scanId,
            teamId,
            siteUrl,
            siteName,
            verdict,
            categories: categories.slice(0, 5),
            topIssues: topIssues.slice(0, 10),
            mode,
            platform,
            platformConfidence
          },
          conversationHistory
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        console.log('✅ [AI Engineer] Response received:', {
          hasMessage: !!data.message,
          hasActions: !!data.actions?.length,
          intent: data.metadata?.intent
        })

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          actions: data.actions
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        console.error('❌ [AI Engineer] API error:', response.status)
        // Fallback response
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: mode === 'founder'
            ? "I'm having trouble connecting right now. Would you like to speak with a human specialist instead?"
            : "Connection error. You can still export issues or create GitHub tickets using the buttons above.",
          actions: [
            { label: 'Talk to a human', action: 'handoff', icon: Mail }
          ]
        }
        setMessages(prev => [...prev, fallbackMessage])
      }
    } catch (error) {
      console.error('AI chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async (action: string) => {
    trackEvent('ai_action_clicked', {
      teamId,
      scanId,
      action,
      mode
    })

    if (action === 'handoff') {
      setShowContactForm(true)
      trackEvent('ai_handoff_requested', { teamId, scanId, mode })
      return
    }

    if (action === 'top-issues') {
      const summary = mode === 'founder'
        ? `Your biggest issues are:\n\n${topIssues.slice(0, 5).map((issue, idx) => 
            `${idx + 1}. **${issue.description}**\n   Impact: ${issue.impact}\n   Affects: Screen reader and keyboard users\n`
          ).join('\n')}\n\nWould you like step-by-step fixes for any of these?`
        : `Top violations by severity:\n\n${topIssues.slice(0, 5).map((issue, idx) =>
            `${idx + 1}. ${issue.rule_id} (${issue.impact})\n   WCAG: ${issue.wcag?.join(', ') || 'N/A'}\n   Selector: ${issue.selector}\n`
          ).join('\n')}`
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: summary
      }])
      return
    }

    if (action === 'webflow-guide') {
      const guide = `Here's how to fix accessibility issues in Webflow:\n\n` +
        `1. **Add Alt Text to Images**\n` +
        `   → Select image → Settings panel → Add descriptive alt text\n\n` +
        `2. **Fix Button Labels**\n` +
        `   → Select button → Settings → Add clear text or aria-label\n\n` +
        `3. **Improve Color Contrast**\n` +
        `   → Use Webflow's color picker → Aim for 4.5:1 ratio for text\n\n` +
        `Want me to send this full guide to your email?`
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: guide,
        actions: [
          { label: 'Yes, email this', action: 'email-designer', icon: Mail }
        ]
      }])
      return
    }

    if (action === 'email-designer') {
      // Open email modal
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I can send a detailed remediation guide to your web designer. What email should I use?'
      }])
      return
    }

    // Generic action
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Processing ${action}...`
    }])
  }

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          topic: formData.get('topic'),
          message: formData.get('message'),
          context: {
            teamId,
            scanId,
            siteUrl,
            verdict
          }
        })
      })

      setShowContactForm(false)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: 'Thanks! A specialist will contact you within 24 hours.'
      }])
    } catch (error) {
      console.error('Contact form error:', error)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true)
          trackEvent('ai_opened', {
            teamId,
            scanId,
            verdict,
            mode,
            trigger: 'manual'
          })
        }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        aria-label="Open AI Engineer Assistant"
        data-testid="ai-engineer-trigger"
      >
        <Sparkles className="w-6 h-6" />
        {(verdict === 'non-compliant' || verdict === 'at-risk') && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>
    )
  }

  return (
    <div 
      className={`
        fixed bottom-6 right-6 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl
        transition-all duration-200
        ${isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'}
      `}
      data-testid="ai-engineer-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">AI Engineer</h3>
            <p className="text-xs text-slate-500">Powered by Auditvia</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            <button
              onClick={() => setMode('founder')}
              className={`
                px-2 py-1 rounded text-xs font-medium transition-all
                ${mode === 'founder' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}
              `}
            >
              <User className="w-3 h-3" />
            </button>
            <button
              onClick={() => setMode('developer')}
              className={`
                px-2 py-1 rounded text-xs font-medium transition-all
                ${mode === 'developer' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}
              `}
            >
              <Code className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isMinimized ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[440px]">
            {messages.map(message => (
              <div
                key={message.id}
                className={`
                  ${message.role === 'user' ? 'ml-auto' : ''}
                  ${message.role === 'system' ? 'mx-auto text-center' : ''}
                  max-w-[85%]
                `}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                    </div>
                    <div>
                      <div className="bg-slate-50 rounded-lg rounded-tl-none px-4 py-2.5">
                        <p className="text-sm text-slate-700 whitespace-pre-line">
                          {message.content}
                        </p>
                      </div>
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.actions.map((action, idx) => {
                            // Map string icon name to actual component
                            const ActionIcon = typeof action.icon === 'string' 
                              ? iconMap[action.icon] 
                              : action.icon
                            return (
                              <button
                                key={idx}
                                onClick={() => handleAction(action.action)}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg text-sm text-slate-700 hover:text-blue-700 transition-colors w-full"
                              >
                                {ActionIcon && <ActionIcon className="w-4 h-4" />}
                                {action.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {message.role === 'user' && (
                  <div className="bg-blue-600 text-white rounded-lg rounded-tr-none px-4 py-2.5">
                    <p className="text-sm">{message.content}</p>
                  </div>
                )}

                {message.role === 'system' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                    <p className="text-sm text-green-800">{message.content}</p>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
                </div>
                <div className="bg-slate-50 rounded-lg rounded-tl-none px-4 py-2.5">
                  <p className="text-sm text-slate-500">Thinking...</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Contact Form Overlay */}
          {showContactForm && (
            <div className="absolute inset-0 bg-white z-10 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Talk to a Human</h3>
                <button
                  onClick={() => setShowContactForm(false)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                  <select
                    name="topic"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="remediation">Help fixing issues</option>
                    <option value="consultation">Accessibility consultation</option>
                    <option value="enterprise">Enterprise inquiry</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                  <textarea
                    name="message"
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={mode === 'founder' ? "Ask me anything..." : "Enter command or question..."}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                data-testid="ai-chat-input"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg transition-colors"
                data-testid="ai-chat-send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Analytics helper
function trackEvent(event: string, data: any) {
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track(event, data)
  }
  console.log('📊 [AI Analytics]', event, data)
}


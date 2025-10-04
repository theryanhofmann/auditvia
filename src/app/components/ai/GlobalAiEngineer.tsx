'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  X, 
  Send, 
  Sparkles, 
  Code, 
  User,
  Mail,
  Loader2,
  Github,
  FileText,
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
  Sparkles,
  X
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  actions?: {
    label: string
    action: string
    icon?: string | LucideIcon
  }[]
}

interface GlobalAiEngineerProps {
  teamId?: string
}

export function GlobalAiEngineer({ teamId }: GlobalAiEngineerProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'founder' | 'developer'>('founder')
  const [contextData] = useState<any>(null)

  // Get context-aware greeting based on current page
  const getContextualGreeting = () => {
    const page = pathname?.split('/')[2] || 'dashboard'
    
    const greetings: Record<string, { founder: string; developer: string; actions: any[] }> = {
      dashboard: {
        founder: "Hi! I'm your AI Engineer. I can help you understand your accessibility compliance, guide you through fixes, or answer any questions about your sites.",
        developer: "AI Engineer ready. I can help with compliance analysis, generate code fixes, or create GitHub issues for your team.",
        actions: [
          { label: 'Show me my compliance status', action: 'dashboard-overview', icon: FileText },
          { label: 'What needs attention?', action: 'top-priorities', icon: AlertTriangle },
          { label: 'How do I improve my score?', action: 'improvement-guide', icon: Code }
        ]
      },
      sites: {
        founder: "I can help you understand your sites, run scans, or explain any accessibility issues you're seeing.",
        developer: "Ready to assist with site monitoring, scan configuration, or bulk issue management.",
        actions: [
          { label: 'How do I add a new site?', action: 'add-site-guide', icon: FileText },
          { label: 'Explain scan results', action: 'scan-explanation', icon: Code },
          { label: 'Setup monitoring', action: 'monitoring-guide', icon: AlertTriangle }
        ]
      },
      violations: {
        founder: "I can explain these violations in plain English and show you exactly how to fix them in your website builder.",
        developer: "I can provide WCAG references, code examples, and help generate tickets for these violations.",
        actions: [
          { label: 'What are the most critical issues?', action: 'top-violations', icon: AlertTriangle },
          { label: 'How do I fix these?', action: 'fix-guide', icon: Code },
          { label: 'Create GitHub issues', action: 'github-bulk', icon: Github }
        ]
      },
      reports: {
        founder: "I can help you understand your compliance trends and what actions to take next.",
        developer: "Ready to analyze trends, export data, or help with compliance reporting.",
        actions: [
          { label: 'Explain my trends', action: 'trend-analysis', icon: FileText },
          { label: 'What should I focus on?', action: 'priorities', icon: AlertTriangle },
          { label: 'Export compliance report', action: 'export-report', icon: Code }
        ]
      },
      scans: {
        founder: "I'm here to help you understand this scan and fix any issues found.",
        developer: "AI Engineer analyzing scan results. Ready to provide code fixes or generate issues.",
        actions: [
          { label: 'What are my biggest issues?', action: 'top-issues', icon: FileText },
          { label: 'How do I fix these?', action: 'fix-guide', icon: Code },
          { label: 'Email this to my team', action: 'email-report', icon: Mail }
        ]
      },
      settings: {
        founder: "I can help you configure Auditvia, set up integrations, or manage your team.",
        developer: "Ready to assist with API configuration, webhook setup, or team management.",
        actions: [
          { label: 'Setup GitHub integration', action: 'github-setup', icon: Github },
          { label: 'Configure notifications', action: 'notification-setup', icon: Mail },
          { label: 'Team management help', action: 'team-guide', icon: User }
        ]
      }
    }

    return greetings[page] || greetings.dashboard
  }

  // Initialize greeting when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = getContextualGreeting()
      const founderGreeting = greeting.founder
      const developerGreeting = greeting.developer

      setMessages([{
        id: '1',
        role: 'assistant',
        content: mode === 'founder' ? founderGreeting : developerGreeting,
        actions: greeting.actions.map(action => ({
          ...action,
          icon: action.icon
        }))
      }])

      trackEvent('ai_opened', {
        teamId,
        userId: session?.user?.id,
        page: pathname,
        mode,
        trigger: 'manual'
      })
    }
  }, [isOpen, mode])

  // Reset messages when page changes
  useEffect(() => {
    if (isOpen) {
      setMessages([])
    }
  }, [pathname])

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

    trackEvent('ai_prompt_sent', {
      teamId,
      userId: session?.user?.id,
      page: pathname,
      mode,
      promptLength: input.length
    })

    try {
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await fetch('/api/ai/chat-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: {
            teamId,
            userId: session?.user?.id,
            page: pathname,
            mode,
            ...contextData
          },
          conversationHistory
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message,
          actions: data.actions
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        const fallbackMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: mode === 'founder'
            ? "I'm having trouble connecting right now. Would you like to speak with a human specialist instead?"
            : "Connection error. Please try again or contact support.",
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

  const handleAction = (action: string) => {
    trackEvent('ai_action_clicked', {
      teamId,
      userId: session?.user?.id,
      page: pathname,
      action,
      mode
    })

    // Handle common actions
    if (action === 'handoff') {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'I can connect you with a human specialist. What\'s the best email to reach you at?'
      }])
      return
    }

    // For other actions, send to AI
    setInput(action)
    handleSend()
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[1500] w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 group"
        aria-label="Open AI Engineer Assistant"
      >
        <Sparkles className="w-6 h-6" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Ask AI Engineer
        </div>
      </button>
    )
  }

  return (
    <div 
      className={`
        fixed bottom-6 right-6 z-[1500] bg-white border border-slate-200 rounded-2xl shadow-2xl
        transition-all duration-200
        ${isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">AI Engineer</h3>
            <p className="text-xs text-slate-500">Always here to help</p>
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
              title="Founder Mode"
            >
              <User className="w-3 h-3" />
            </button>
            <button
              onClick={() => setMode('developer')}
              className={`
                px-2 py-1 rounded text-xs font-medium transition-all
                ${mode === 'developer' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}
              `}
              title="Developer Mode"
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
                            const ActionIcon = typeof action.icon === 'string' 
                              ? iconMap[action.icon] 
                              : action.icon
                            return (
                              <button
                                key={idx}
                                onClick={() => handleAction(action.action)}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg text-sm text-slate-700 hover:text-blue-700 transition-colors w-full text-left"
                              >
                                {ActionIcon && <ActionIcon className="w-4 h-4 flex-shrink-0" />}
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

            <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-3 rounded-b-2xl bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={mode === 'founder' ? "Ask me anything..." : "Enter command or question..."}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
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


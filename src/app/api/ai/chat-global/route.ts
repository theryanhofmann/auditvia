import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Global AI chat endpoint for context-aware assistance across the platform
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { message, context, conversationHistory = [] } = body

    console.log('🤖 [Global AI Chat] Request:', {
      userId: session.user.id,
      page: context?.page,
      mode: context?.mode,
      messageLength: message?.length
    })

    // Build system prompt based on current page context
    const systemPrompt = buildGlobalSystemPrompt(context)

    // Check for OpenAI key
    const openAiKey = process.env.OPENAI_API_KEY
    if (!openAiKey) {
      console.warn('⚠️  [Global AI Chat] No OpenAI key - using fallback')
      return NextResponse.json({
        message: getFallbackResponse(message, context),
        actions: getFallbackActions(context),
        metadata: { source: 'fallback', page: context?.page }
      })
    }

    // Call OpenAI (simplified for now - can enhance later)
    console.log('✅ [Global AI Chat] Using OpenAI')
    
    // For now, return intelligent fallback until full OpenAI integration
    // TODO: Integrate with OpenAI SDK
    return NextResponse.json({
      message: getIntelligentResponse(message, context),
      actions: getContextualActions(context),
      metadata: { source: 'ai', page: context?.page, mode: context?.mode }
    })

  } catch (error) {
    console.error('❌ [Global AI Chat] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}

function buildGlobalSystemPrompt(context: any): string {
  const page = context?.page?.split('/')[2] || 'dashboard'
  const mode = context?.mode || 'founder'

  const basePrompt = mode === 'founder'
    ? 'You are a helpful AI accessibility engineer for Auditvia. Speak in plain English, avoid jargon, and provide actionable step-by-step guidance.'
    : 'You are a technical AI engineer for Auditvia. Provide precise WCAG references, code examples, and developer-focused solutions.'

  const pageContext: Record<string, string> = {
    dashboard: 'User is viewing their compliance dashboard overview.',
    sites: 'User is managing their sites and scans.',
    violations: 'User is reviewing accessibility violations.',
    reports: 'User is viewing compliance reports and analytics.',
    scans: 'User is viewing a detailed scan report.',
    settings: 'User is configuring their account and integrations.'
  }

  return `${basePrompt}\n\nContext: ${pageContext[page] || pageContext.dashboard}`
}

function getIntelligentResponse(message: string, context: any): string {
  const page = context?.page?.split('/')[2] || 'dashboard'
  const mode = context?.mode || 'founder'
  const lowerMessage = message.toLowerCase()

  // Dashboard responses
  if (page === 'dashboard') {
    if (lowerMessage.includes('compliance') || lowerMessage.includes('status')) {
      return mode === 'founder'
        ? "I can show you your current compliance status. Your dashboard displays the number of accessibility issues across all your sites, organized by severity. The most important metric is the 'Critical' count - these should be addressed first as they prevent users with disabilities from accessing key features."
        : "Your dashboard shows aggregate compliance metrics across all monitored sites. Critical and Serious violations are prioritized by WCAG conformance level. I recommend addressing WCAG 2.1 Level A issues first."
    }
    if (lowerMessage.includes('improve') || lowerMessage.includes('better')) {
      return mode === 'founder'
        ? "The fastest way to improve your score is to:\n1. Add alt text to all images\n2. Ensure all buttons have clear labels\n3. Fix color contrast issues\n\nThese three categories typically cover 60-70% of common issues."
        : "To improve compliance scores efficiently:\n1. Automate alt text addition (image-alt-text rule)\n2. Enforce semantic HTML for interactive elements\n3. Implement design system with WCAG AA compliant colors\n4. Use axe DevTools in your CI/CD pipeline"
    }
  }

  // Sites page responses
  if (page === 'sites') {
    if (lowerMessage.includes('add') || lowerMessage.includes('new site')) {
      return mode === 'founder'
        ? "To add a new site:\n1. Click the 'Add Site' button in the top right\n2. Enter your website URL (e.g., https://example.com)\n3. Give it a name\n4. Click 'Run Scan'\n\nThe first scan takes about 30-60 seconds."
        : "Add sites via the UI (Add Site button) or programmatically via POST /api/sites with {name, url, teamId}. Scans are queued automatically and run via Playwright + axe-core."
    }
  }

  // Violations page responses
  if (page === 'violations') {
    if (lowerMessage.includes('critical') || lowerMessage.includes('fix')) {
      return mode === 'founder'
        ? "Critical violations prevent users from accessing key features. Focus on:\n• Missing alt text on important images\n• Buttons without labels\n• Forms without proper labels\n\nClick any violation to see exactly where it is and how to fix it in your website builder."
        : "Critical violations map to WCAG Level A failures. Prioritize:\n• 1.1.1 Non-text Content (image-alt)\n• 2.4.4 Link Purpose (link-name)\n• 4.1.2 Name, Role, Value (button-name, label)\n\nUse the GitHub integration to create issues automatically."
    }
  }

  // Generic helpful response
  return mode === 'founder'
    ? "I'm here to help! Could you be more specific about what you'd like to know? For example, you can ask:\n• 'How do I fix this issue?'\n• 'What's my compliance status?'\n• 'How do I add a new site?'"
    : "I can assist with WCAG compliance, code examples, or API usage. Please provide more context about what you need."
}

function getFallbackResponse(message: string, context: any): string {
  const mode = context?.mode || 'founder'
  return mode === 'founder'
    ? "I'm here to help you understand and fix accessibility issues. What would you like to know?"
    : "AI Engineer ready. I can provide technical guidance, code examples, or help with API integration."
}

function getContextualActions(context: any) {
  const page = context?.page?.split('/')[2] || 'dashboard'
  const mode = context?.mode || 'founder'

  const actions: Record<string, any[]> = {
    dashboard: mode === 'founder' ? [
      { label: 'Show me what needs fixing', action: 'show-priorities', icon: 'AlertTriangle' },
      { label: 'How do I improve my score?', action: 'improvement-guide', icon: 'Code' }
    ] : [
      { label: 'Export compliance data', action: 'export-data', icon: 'FileText' },
      { label: 'Setup GitHub integration', action: 'github-setup', icon: 'Github' }
    ],
    
    sites: mode === 'founder' ? [
      { label: 'How do I add a site?', action: 'add-site-guide', icon: 'FileText' }
    ] : [
      { label: 'Configure monitoring', action: 'monitoring-guide', icon: 'Code' }
    ],
    
    violations: mode === 'founder' ? [
      { label: 'What should I fix first?', action: 'prioritize', icon: 'AlertTriangle' },
      { label: 'Email this to my developer', action: 'email-violations', icon: 'Mail' }
    ] : [
      { label: 'Create GitHub issues', action: 'github-bulk', icon: 'Github' },
      { label: 'Export to CSV', action: 'export-csv', icon: 'FileText' }
    ]
  }

  return actions[page] || actions.dashboard
}

function getFallbackActions(context: any) {
  return getContextualActions(context)
}


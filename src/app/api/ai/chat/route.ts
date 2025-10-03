import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { detectPlatform, getPlatformGuide } from '@/lib/platform-detector'
import OpenAI from 'openai'

// Initialize OpenAI client if API key is present
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

// Log configuration on module load
if (openai) {
  console.log('✅ [AI Chat] OpenAI API configured and ready')
} else {
  console.log('⚠️  [AI Chat] No OpenAI API key - using deterministic fallback')
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, context, conversationHistory = [] } = body

    if (!message || !context) {
      return NextResponse.json({ error: 'Message and context required' }, { status: 400 })
    }

    console.log('🤖 [AI Chat] Request:', {
      userId: session.user.id,
      scanId: context.scanId,
      mode: context.mode,
      messageLength: message.length,
      historyLength: conversationHistory.length
    })

    // Use stored platform from scan, or detect as fallback
    const platform = context.platform 
      ? (typeof context.platform === 'string' 
          ? { platform: context.platform, confidence: context.platformConfidence || 0.8, detected_from: context.platformDetectedFrom || 'scan' }
          : context.platform)
      : detectPlatform({ url: context.siteUrl })

    console.log('🔍 [AI Chat] Platform info:', {
      platform: platform.platform,
      confidence: platform.confidence || 'unknown',
      source: context.platform ? 'stored-from-scan' : 'fallback-detection',
      hasGuides: platform.capabilities?.guides || false
    })

    // Build AI context with conversation history
    const aiContext = buildAIContext(context, platform, conversationHistory)

    // Generate response
    const response = await generateAIResponse(message, aiContext, context.mode)

    console.log('✅ [AI Chat] Response generated:', {
      mode: context.mode,
      hasActions: response.actions?.length > 0,
      intent: response.intent || 'unknown'
    })

    return NextResponse.json({
      message: response.content,
      actions: response.actions,
      metadata: {
        platform: platform.platform,
        confidence: platform.confidence,
        intent: response.intent
      }
    })

  } catch (error) {
    console.error('❌ [AI Chat] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

/**
 * Build comprehensive AI context
 */
function buildAIContext(context: any, platform: any, conversationHistory: any[] = []) {
  // Sort issues by severity
  const sortedIssues = [...(context.topIssues || [])].sort((a, b) => {
    const severityOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 }
    return (severityOrder[a.impact as keyof typeof severityOrder] || 4) - 
           (severityOrder[b.impact as keyof typeof severityOrder] || 4)
  })

  return {
    site: {
      url: context.siteUrl,
      name: context.siteName,
      platform: platform.platform,
      platformCapabilities: platform.capabilities
    },
    scan: {
      id: context.scanId,
      verdict: context.verdict,
      totalIssues: sortedIssues.length,
      criticalCount: sortedIssues.filter((i: any) => i.impact === 'critical').length,
      seriousCount: sortedIssues.filter((i: any) => i.impact === 'serious').length,
      moderateCount: sortedIssues.filter((i: any) => i.impact === 'moderate').length,
      categories: context.categories
    },
    user: {
      mode: context.mode,
      teamId: context.teamId
    },
    topIssues: sortedIssues.map((issue: any) => ({
      id: issue.id,
      rule: issue.rule_id || issue.id,
      description: issue.description,
      impact: issue.impact,
      wcag: issue.wcag,
      selector: issue.selector
    })),
    conversationHistory: conversationHistory.slice(-5) // Keep last 5 exchanges
  }
}

/**
 * Generate AI response using OpenAI or fallback to deterministic
 */
async function generateAIResponse(message: string, context: any, mode: 'founder' | 'developer') {
  // Check if OpenAI is available
  if (openai) {
    console.log('🤖 [AI Chat] Using OpenAI API')
    return generateOpenAIResponse(message, context, mode)
  }
  
  console.log('⚙️  [AI Chat] Using deterministic fallback (no OpenAI key)')
  return generateDeterministicResponse(message, context, mode)
}

/**
 * Generate response using OpenAI API
 */
async function generateOpenAIResponse(message: string, context: any, mode: 'founder' | 'developer') {
  try {
    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context, mode)
    
    // Build conversation messages
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      })),
      { role: 'user', content: message }
    ]

    console.log('🔄 [OpenAI] Calling API:', { 
      messageCount: messages.length,
      mode,
      platform: context.site.platform,
      issueCount: context.topIssues.length
    })

    const completion = await openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    })

    const responseText = completion.choices[0].message.content || 'I encountered an error generating a response.'

    console.log('✅ [OpenAI] Response received:', {
      tokensUsed: completion.usage?.total_tokens,
      responseLength: responseText.length
    })

    // Detect intent from response to suggest actions
    const suggestedActions = detectActionsFromResponse(responseText, context, mode)

    return {
      intent: 'openai',
      content: responseText,
      actions: suggestedActions
    }
  } catch (error) {
    console.error('❌ [OpenAI] API error:', error)
    // Fallback to deterministic on error
    console.log('⚠️  [AI Chat] Falling back to deterministic due to OpenAI error')
    return generateDeterministicResponse(message, context, mode)
  }
}

/**
 * Build system prompt with full context
 */
function buildSystemPrompt(context: any, mode: 'founder' | 'developer'): string {
  // Get concrete examples from top issues
  const exampleNodes = context.topIssues.slice(0, 3).map((issue: any) => ({
    url: context.site.url,
    selector: issue.selector || 'element',
    rule: issue.rule,
    snippet: getNodeSnippet(issue)
  }))

  const modeInstructions = mode === 'founder'
    ? `**Audience**: Non-technical founder
**Language**: Plain English, zero jargon
**Focus**: Business impact, user experience, legal risk
**Actions**: "Fix contrast now", "Open ${context.site.platform} steps", "Email designer", "Download CSV"
**Tone**: Encouraging, practical, executive-level`
    : `**Audience**: Developer
**Language**: Technical, precise
**Focus**: Implementation, code, WCAG criteria
**Actions**: "Create GitHub issues", code snippets, selectors
**Tone**: Direct, technical, implementation-focused`

  const platformInstructions = getPlatformInstructions(context.site.platform)

  return `You are Auditvia AI Engineer, an expert accessibility compliance assistant.

${modeInstructions}

**Current Scan Context:**
Site: **${context.site.name}**
URL: ${context.site.url}
Platform: **${context.site.platform}**
Verdict: **${context.scan.verdict}** (${getVerdictEmoji(context.scan.verdict)})
Issues: ${context.scan.totalIssues} total (${context.scan.criticalCount} critical, ${context.scan.seriousCount} serious, ${context.scan.moderateCount} moderate)

**Top 5 Rules to Fix:**
${context.topIssues.slice(0, 5).map((issue: any, idx: number) => 
  `${idx + 1}. [${issue.impact.toUpperCase()}] ${issue.description}
   Rule: ${issue.rule}
   Selector: ${issue.selector || 'multiple elements'}
   WCAG: ${issue.wcag?.join(', ') || 'N/A'}`
).join('\n\n')}

**3 Concrete Examples:**
${exampleNodes.map((node: any, idx: number) => 
  `Example ${idx + 1}: ${node.rule}
   Location: ${node.url}
   Selector: ${node.selector}
   Code: ${node.snippet}`
).join('\n\n')}

${platformInstructions}

**Critical Instructions:**
1. **Use scan context**: Always reference actual site name, verdict, and specific issues from above
2. **Platform-specific**: ${context.site.platform === 'framer' || context.site.platform === 'webflow' || context.site.platform === 'wordpress' ? 
   `Give EXACT steps for ${context.site.platform} (menus, fields, publish path). No generic instructions.` : 
   `Platform detection uncertain - ask "Do you use Framer/Webflow/WordPress?" then provide specific steps`}
3. **Contrast issues**: When discussing color-contrast, compute compliant alternatives and suggest an Accessible Palette:
   • Body text: #1a1a1a (21:1 ratio)
   • Muted text: #4a4a4a (9:1 ratio)
   • Primary brand: [suggest based on current colors]
   • On-primary text: #ffffff (ensure 4.5:1+)
   Offer "Apply to all" vs "Per element"
4. **Time estimates**: Include realistic time (e.g., "~15min", "~2 hours")
5. **Format**: Lead with answer, add time estimate, end with ONE next action
6. **Tone**: Short, confident, zero filler. No "I hope this helps" or "Let me know"
7. **Length**: Max 250 words

**Response Structure:**
[Direct answer with specifics]
[Time estimate]
[One clear next action]

Never say "guide not available" - if uncertain, ask which platform they use.`
}

function getVerdictEmoji(verdict: string): string {
  const emojis: Record<string, string> = {
    'compliant': '✅',
    'at-risk': '⚠️',
    'non-compliant': '❌'
  }
  return emojis[verdict] || '⚠️'
}

function getNodeSnippet(issue: any): string {
  // Generate realistic code snippet from issue
  const snippets: Record<string, string> = {
    'button-name': '<button></button>',
    'link-name': '<a href="/contact"></a>',
    'image-alt': '<img src="logo.png">',
    'color-contrast': 'color: #999; background: #fff;',
    'label': '<input type="text">',
    'aria-required-attr': '<div role="button"></div>',
    'heading-order': '<h1>Title</h1><h3>Subtitle</h3>'
  }
  return snippets[issue.rule] || `<element>${issue.description}</element>`
}

function getPlatformInstructions(platform: string): string {
  const instructions: Record<string, string> = {
    'framer': `**Framer-Specific Steps Format:**
When giving instructions, use exact Framer UI paths:
1. Select the element in canvas
2. Right panel → Accessibility section
3. Add "ARIA Label" field with descriptive text
4. Click Publish → Update site
Reference: Components panel, Props panel, Canvas interactions`,
    
    'webflow': `**Webflow-Specific Steps Format:**
When giving instructions, use exact Webflow UI paths:
1. Select element in Designer
2. Settings panel (D key) → Element Settings
3. Add alt text / aria-label / role attribute
4. Publish to [staging/production]
Reference: Designer, Settings panel, Custom attributes, Style panel`,
    
    'wordpress': `**WordPress-Specific Steps Format:**
When giving instructions, use exact WordPress paths:
1. Edit page in Block Editor / Page Builder
2. Select block/element → Block settings (right sidebar)
3. Advanced → "Additional CSS class" or "HTML attributes"
4. Update/Publish page
Reference: Block Editor, Customizer, Appearance → Theme Editor`,
    
    'nextjs': `**Next.js/React-Specific Steps:**
Provide JSX/TSX code with proper imports and TypeScript types.
Reference semantic HTML and ARIA attributes.`,
    
    'react': `**React-Specific Steps:**
Provide JSX code with hooks (useState, useEffect) if needed.
Reference WAI-ARIA patterns and React best practices.`
  }
  
  return instructions[platform] || `**Platform: ${platform}**
Detection confidence low. Ask: "Are you using Framer, Webflow, or WordPress?" then provide exact steps for their builder.`
}

/**
 * Detect suggested actions from AI response
 */
function detectActionsFromResponse(response: string, context: any, mode: 'founder' | 'developer'): any[] {
  const responseLower = response.toLowerCase()
  const actions: any[] = []

  // Detect if discussing contrast issues
  const hasContrastIssues = context.topIssues.some((i: any) => 
    i.rule?.includes('contrast') || i.description?.toLowerCase().includes('contrast')
  )
  const discussingContrast = responseLower.includes('contrast') || responseLower.includes('color')

  // Mode-specific action detection
  if (mode === 'founder') {
    // Contrast-specific actions
    if (discussingContrast && hasContrastIssues) {
      actions.push({ 
        label: 'Fix contrast now', 
        action: 'fix-contrast', 
        icon: 'Sparkles' 
      })
      actions.push({ 
        label: 'Get accessible palette', 
        action: 'generate-palette', 
        icon: 'Code' 
      })
    }

    // Platform-specific guide
    if (responseLower.includes('step') || responseLower.includes('how') || responseLower.includes(context.site.platform)) {
      actions.push({ 
        label: `Open ${context.site.platform} steps`, 
        action: 'platform-guide', 
        icon: 'ExternalLink' 
      })
    }

    // Email/export actions
    if (responseLower.includes('designer') || responseLower.includes('team') || responseLower.includes('report')) {
      actions.push({ 
        label: 'Email to designer', 
        action: 'email-designer', 
        icon: 'Mail' 
      })
    }

    if (responseLower.includes('download') || responseLower.includes('export') || responseLower.includes('csv')) {
      actions.push({ 
        label: 'Download CSV', 
        action: 'download-csv', 
        icon: 'FileText' 
      })
    }

    // Priority/fix actions
    if (responseLower.includes('priority') || responseLower.includes('first') || responseLower.includes('start')) {
      actions.push({ 
        label: 'Show priorities', 
        action: 'top-priorities', 
        icon: 'AlertTriangle' 
      })
    }

  } else {
    // Developer mode actions
    
    // GitHub actions (always show issue count)
    if (responseLower.includes('github') || responseLower.includes('issue') || responseLower.includes('pr')) {
      const criticalCount = context.scan.criticalCount || 0
      const totalCount = Math.min(context.topIssues.length, 10)
      actions.push({ 
        label: `Create ${criticalCount > 0 ? criticalCount : totalCount} GitHub issues`, 
        action: 'github-bulk', 
        icon: 'Github' 
      })
    }

    // Code/fix actions with specifics
    if (responseLower.includes('code') || responseLower.includes('fix') || responseLower.includes('snippet')) {
      const topRule = context.topIssues[0]?.rule || 'issues'
      actions.push({ 
        label: `Generate fixes for ${topRule}`, 
        action: 'generate-code', 
        icon: 'Code' 
      })
    }

    // Selector/element actions
    if (responseLower.includes('selector') || responseLower.includes('element')) {
      actions.push({ 
        label: 'Show all selectors', 
        action: 'show-selectors', 
        icon: 'FileText' 
      })
    }

    // Contrast palette for developers too
    if (discussingContrast && hasContrastIssues) {
      actions.push({ 
        label: 'Generate accessible palette', 
        action: 'generate-palette', 
        icon: 'Code' 
      })
    }

    // Priority matrix
    if (responseLower.includes('priority') || responseLower.includes('p0') || responseLower.includes('critical')) {
      actions.push({ 
        label: 'View priority matrix', 
        action: 'top-priorities', 
        icon: 'AlertTriangle' 
      })
    }
  }

  // Default actions if none detected (contextual fallbacks)
  if (actions.length === 0 && context.topIssues.length > 0) {
    if (mode === 'founder') {
      actions.push({ 
        label: 'Show what to fix first', 
        action: 'top-priorities', 
        icon: 'AlertTriangle' 
      })
      actions.push({ 
        label: `${context.site.platform} fix guide`, 
        action: 'platform-guide', 
        icon: 'Code' 
      })
    } else {
      actions.push({ 
        label: `Create ${Math.min(context.topIssues.length, 10)} GitHub issues`, 
        action: 'github-bulk', 
        icon: 'Github' 
      })
      actions.push({ 
        label: 'Generate code fixes', 
        action: 'generate-code', 
        icon: 'Code' 
      })
    }
  }

  // Deduplicate and limit to 3 most relevant actions
  const uniqueActions = Array.from(
    new Map(actions.map(a => [a.action, a])).values()
  )
  
  return uniqueActions.slice(0, 3)
}

/**
 * Generate deterministic response (fallback when no OpenAI)
 */
function generateDeterministicResponse(message: string, context: any, mode: 'founder' | 'developer') {
  const messageLower = message.toLowerCase()
  
  // Check if this is a first message
  const isFirstMessage = context.conversationHistory.length === 0

  console.log('🎯 [AI Chat] Intent detection:', { message: messageLower.substring(0, 50), isFirstMessage })

  // Intent detection with logging
  if (messageLower.includes('priority') || messageLower.includes('first') || messageLower.includes('start') || messageLower.includes('top')) {
    console.log('✨ [AI Chat] Intent: PRIORITIES')
    return handlePriorityRequest(message, context, mode)
  }

  if (messageLower.includes('how') && messageLower.includes('fix')) {
    console.log('✨ [AI Chat] Intent: FIX_GUIDE')
    return handleFixRequest(message, context, mode)
  }

  if (messageLower.includes('github') || messageLower.includes('issue') || messageLower.includes('pr')) {
    console.log('✨ [AI Chat] Intent: GITHUB')
    return handleGitHubRequest(message, context, mode)
  }

  if (messageLower.includes('email') || messageLower.includes('designer') || messageLower.includes('send')) {
    console.log('✨ [AI Chat] Intent: EMAIL')
    return handleEmailRequest(message, context, mode)
  }

  if (messageLower.includes('code') || messageLower.includes('snippet')) {
    console.log('✨ [AI Chat] Intent: CODE')
    return handleCodeRequest(message, context, mode)
  }

  if (messageLower.includes('what') || messageLower.includes('explain') || messageLower.includes('tell')) {
    console.log('✨ [AI Chat] Intent: EXPLAIN')
    return handleExplainRequest(message, context, mode)
  }

  if (messageLower.includes(context.site.platform)) {
    console.log('✨ [AI Chat] Intent: PLATFORM_GUIDE')
    return handlePlatformGuideRequest(message, context, mode)
  }

  // Default/greeting response (only on first message to avoid loops)
  console.log('✨ [AI Chat] Intent: DEFAULT/GREETING')
  
  if (isFirstMessage) {
    return {
      intent: 'greeting',
      content: mode === 'founder'
        ? `Hi! I've analyzed your scan and found **${context.scan.totalIssues} accessibility issues**.\n\n${context.scan.criticalCount > 0 ? `⚠️ ${context.scan.criticalCount} are critical and need immediate attention.\n\n` : ''}I can help you:\n• Understand what needs fixing and why\n• Show you how to fix issues in ${context.site.platform}\n• Create an action plan prioritized by impact\n\nWhat would you like to start with?`
        : `Scan complete. Found **${context.scan.totalIssues} violations**:\n• ${context.scan.criticalCount} critical\n• ${context.scan.seriousCount} serious\n• ${context.scan.moderateCount} moderate\n\nI can assist with:\n• WCAG remediation guides\n• Code generation for common fixes\n• GitHub issue/PR creation\n• Technical documentation export\n\nWhere should we begin?`,
      actions: mode === 'founder' ? [
        { label: 'Show me priorities', action: 'top-priorities', icon: 'AlertTriangle' },
        { label: `${context.site.platform} fix guide`, action: 'platform-guide', icon: 'Code' }
      ] : [
        { label: 'View prioritized issues', action: 'top-priorities', icon: 'AlertTriangle' },
        { label: 'Generate code fixes', action: 'generate-code', icon: 'Code' }
      ]
    }
  }
  
  // For follow-up messages, be more conversational
  return {
    intent: 'clarification',
    content: mode === 'founder'
      ? `I'm not sure what you're asking. Try:\n• "Show me priorities" - See what to fix first\n• "How do I fix this?" - Get step-by-step guides\n• "Email to designer" - Share a report`
      : `Command not recognized. Available options:\n• priorities - View sorted issue list\n• fix [rule-id] - Get remediation code\n• github - Create issues/PRs\n• explain - WCAG criteria details`,
    actions: []
  }
}

/**
 * Handle fix-related requests
 */
function handleFixRequest(message: string, context: any, mode: 'founder' | 'developer') {
  const topIssue = context.topIssues[0]
  
  console.log('🔧 [Fix Request] Processing:', { hasIssue: !!topIssue, mode })
  
  if (!topIssue) {
    return {
      intent: 'fix',
      content: 'No issues found to fix! Your site looks good.',
      actions: []
    }
  }

  const guide = getPlatformGuide(context.site.platform, topIssue.rule, mode)

  return {
    intent: 'fix',
    content: mode === 'founder'
      ? `Let's fix your **${topIssue.description}** issue. This is ${topIssue.impact} priority.\n\n${guide}\n\nWant me to walk you through the others?`
      : `**${topIssue.rule}** (${topIssue.impact})\n**WCAG**: ${topIssue.wcag?.join(', ') || 'N/A'}\n\n${guide}\n\nI can generate a PR or create GitHub issues for batch fixes.`,
    actions: mode === 'founder' ? [
      { label: 'Yes, show next issue', action: 'next-issue', icon: 'Code' },
      { label: 'Email full guide', action: 'email-guide', icon: 'Mail' }
    ] : [
      { label: 'Generate code fix', action: 'generate-fix', icon: 'Code' },
      { label: 'Create GitHub issue', action: 'create-issue', icon: 'Github' }
    ]
  }
}

/**
 * Handle GitHub-related requests
 */
function handleGitHubRequest(message: string, context: any, mode: 'founder' | 'developer') {
  const issueCount = context.topIssues?.length || 0

  console.log('🐙 [GitHub] Creating issues:', { count: issueCount, mode })

  return {
    intent: 'github',
    content: mode === 'founder'
      ? `I can create tickets in GitHub for your development team. Each ticket will include:\n\n• Clear description of the issue\n• Step-by-step fix instructions\n• WCAG compliance criteria\n• Priority level\n\nShall I create ${issueCount} GitHub issues?`
      : `I'll create GitHub issues for all ${issueCount} violations. Each issue will include:\n\n\`\`\`markdown\n## Accessibility Violation: [Rule Name]\n\n**Severity**: Critical\n**WCAG**: 2.2 Level AA\n**Selector**: .main-nav button\n\n### Fix\n[Code snippet]\n\n### Testing\n[Validation steps]\n\`\`\`\n\nProceed?`,
    actions: [
      { label: `Create ${issueCount} GitHub issues`, action: 'github-bulk-create', icon: 'Github' },
      { label: 'Preview issue format', action: 'preview-issue', icon: 'FileText' }
    ]
  }
}

/**
 * Handle email/designer requests
 */
function handleEmailRequest(message: string, context: any, mode: 'founder' | 'developer') {
  console.log('📧 [Email] Preparing report:', { mode, issueCount: context.topIssues?.length || 0 })

  return {
    intent: 'email',
    content: mode === 'founder'
      ? `I'll create a beautiful, non-technical report for your designer that includes:\n\n📊 Visual examples of issues\n✅ Before/After mockups\n📝 Plain-language descriptions\n🎯 Prioritized action list\n\nWhat email should I send it to?`
      : `I can generate a technical report including:\n\n• All ${context.topIssues?.length || 0} violations with selectors\n• Code snippets for fixes\n• WCAG 2.2 criteria references\n• Testing procedures\n\nProvide recipient email:`,
    actions: [
      { label: 'Enter email address', action: 'prompt-email', icon: 'Mail' }
    ]
  }
}

/**
 * Handle code generation requests
 */
function handleCodeRequest(message: string, context: any, mode: 'founder' | 'developer') {
  const topIssue = context.topIssues[0]

  console.log('💻 [Code] Generating fix:', { hasIssue: !!topIssue, rule: topIssue?.rule })

  if (!topIssue) {
    return { 
      intent: 'code',
      content: 'No issues to generate code for!', 
      actions: [] 
    }
  }

  const codeSnippet = generateCodeFix(topIssue, context.site.platform)

  return {
    intent: 'code',
    content: `Here's a fix for **${topIssue.description}**:\n\n\`\`\`${getLanguage(context.site.platform)}\n${codeSnippet}\n\`\`\`\n\nThis addresses WCAG ${topIssue.wcag?.join(', ') || '2.2 AA'}.`,
    actions: [
      { label: 'Copy code', action: 'copy-code', icon: 'Code' },
      { label: 'Create PR with this fix', action: 'create-pr', icon: 'Github' },
      { label: 'Show next issue', action: 'next-code-fix', icon: 'Code' }
    ]
  }
}

/**
 * Handle explanation requests
 */
function handleExplainRequest(message: string, context: any, mode: 'founder' | 'developer') {
  const topIssue = context.topIssues[0]

  console.log('📖 [Explain] Describing issue:', { rule: topIssue?.rule, mode })

  if (!topIssue) {
    return {
      intent: 'explain',
      content: 'No issues to explain! Your site is accessible.',
      actions: []
    }
  }

  return {
    intent: 'explain',
    content: mode === 'founder'
      ? `Your biggest issue is **${topIssue.description}**.\n\n🎯 **Why it matters**: People using screen readers or keyboards can't access this part of your site. This affects about 15-20% of users and violates ADA requirements.\n\n💡 **The fix**: ${getSimpleExplanation(topIssue)}\n\nWant to see how to do this in ${context.site.platform}?`
      : `**${topIssue.rule}** - ${topIssue.impact} severity\n\n**WCAG Criteria**: ${topIssue.wcag?.join(', ') || 'N/A'}\n**Affected Elements**: ${topIssue.selector || 'Multiple'}\n\n**Technical Impact**:\n• Blocks screen reader navigation\n• Keyboard trap potential\n• ARIA tree incomplete\n\n**Remediation**: ${getTechnicalExplanation(topIssue)}`,
    actions: [
      { label: 'Show fix instructions', action: 'show-fix', icon: 'Code' },
      { label: 'Explain next issue', action: 'explain-next', icon: 'Code' }
    ]
  }
}

/**
 * Handle priority requests
 */
function handlePriorityRequest(message: string, context: any, mode: 'founder' | 'developer') {
  const critical = context.topIssues.filter((i: any) => i.impact === 'critical')
  const serious = context.topIssues.filter((i: any) => i.impact === 'serious')
  const moderate = context.topIssues.filter((i: any) => i.impact === 'moderate')

  console.log('📊 [Priority] Sorted issues:', {
    critical: critical.length,
    serious: serious.length,
    moderate: moderate.length
  })

  if (critical.length === 0 && serious.length === 0 && moderate.length === 0) {
    return {
      intent: 'priorities',
      content: mode === 'founder'
        ? '🎉 Great news! No critical or serious issues found. Your site is in good shape!'
        : 'No P0/P1 violations detected. Site meets WCAG AA baseline.',
      actions: []
    }
  }

  return {
    intent: 'priorities',
    content: mode === 'founder'
      ? `Here's your prioritized action plan:\n\n${critical.length > 0 ? `🔴 **Fix First** (${critical.length} critical):\n${critical.slice(0, 3).map((i: any, idx: number) => `  ${idx + 1}. ${i.description}`).join('\n')}${critical.length > 3 ? `\n  ...and ${critical.length - 3} more` : ''}\n\n` : ''}${serious.length > 0 ? `🟡 **Fix Next** (${serious.length} serious):\n${serious.slice(0, 3).map((i: any, idx: number) => `  ${idx + 1}. ${i.description}`).join('\n')}${serious.length > 3 ? `\n  ...and ${serious.length - 3} more` : ''}\n\n` : ''}${moderate.length > 0 ? `🟢 **Then Fix** (${moderate.length} moderate):\n${moderate.slice(0, 2).map((i: any, idx: number) => `  ${idx + 1}. ${i.description}`).join('\n')}${moderate.length > 2 ? `\n  ...and ${moderate.length - 2} more` : ''}\n\n` : ''}**Recommendation**: Start with critical issues - they have the biggest legal risk and user impact. Want to see how to fix the first one?`
      : `**Priority Matrix** (Total: ${context.topIssues.length}):\n\n${critical.length > 0 ? `**P0 - Critical** (${critical.length}):\n${critical.slice(0, 3).map((i: any) => `  • ${i.rule} - ${i.selector || 'multiple'}`).join('\n')}${critical.length > 3 ? `\n  ...${critical.length - 3} more` : ''}\n\n` : ''}${serious.length > 0 ? `**P1 - Serious** (${serious.length}):\n${serious.slice(0, 3).map((i: any) => `  • ${i.rule} - ${i.selector || 'multiple'}`).join('\n')}${serious.length > 3 ? `\n  ...${serious.length - 3} more` : ''}\n\n` : ''}${moderate.length > 0 ? `**P2 - Moderate** (${moderate.length}):\n${moderate.slice(0, 2).map((i: any) => `  • ${i.rule} - ${i.selector || 'multiple'}`).join('\n')}${moderate.length > 2 ? `\n  ...${moderate.length - 2} more` : ''}\n\n` : ''}Address P0 violations first to reach WCAG AA baseline.`,
    actions: critical.length > 0 ? [
      { label: `Fix: ${critical[0].description}`, action: 'fix-first-critical', icon: 'Code' },
      { label: 'Create GitHub issues (prioritized)', action: 'github-prioritized', icon: 'Github' }
    ] : serious.length > 0 ? [
      { label: `Fix: ${serious[0].description}`, action: 'fix-first-serious', icon: 'Code' },
      { label: 'Create GitHub issues', action: 'github-bulk', icon: 'Github' }
    ] : []
  }
}

/**
 * Handle platform-specific guide requests
 */
function handlePlatformGuideRequest(message: string, context: any, mode: 'founder' | 'developer') {
  const platform = context.site.platform
  const topIssue = context.topIssues[0]

  console.log('🔧 [Platform Guide] Generating for:', { platform, rule: topIssue?.rule })

  if (!topIssue) {
    return {
      intent: 'platform-guide',
      content: 'No issues found to generate guides for!',
      actions: []
    }
  }

  const guide = getPlatformGuide(platform, topIssue.rule, mode)
  
  return {
    intent: 'platform-guide',
    content: mode === 'founder'
      ? `Here's how to fix **${topIssue.description}** in ${platform}:\n\n${guide}\n\nThis will make your site accessible to everyone and keep you legally compliant. Need help with the next issue?`
      : `**Fix Guide for ${topIssue.rule}** (${platform}):\n\n${guide}\n\n**WCAG**: ${topIssue.wcag?.join(', ') || 'N/A'}\n**Selector**: ${topIssue.selector || 'Multiple elements'}\n\nReady to fix the next violation?`,
    actions: [
      { label: 'Show next issue', action: 'next-issue', icon: 'Code' },
      { label: 'Create GitHub issue for this', action: 'github-single', icon: 'Github' }
    ]
  }
}

// Helper functions
function getLanguage(platform: string): string {
  const languages: Record<string, string> = {
    react: 'tsx',
    nextjs: 'tsx',
    vue: 'vue',
    wordpress: 'php',
    webflow: 'html',
    framer: 'tsx',
    custom: 'html'
  }
  return languages[platform] || 'html'
}

function generateCodeFix(issue: any, platform: string): string {
  // Basic code generation - will be enhanced with AI
  const fixes: Record<string, string> = {
    'image-alt': `<img src="..." alt="Descriptive text about the image" />`,
    'button-name': `<button aria-label="Submit form">Submit</button>`,
    'link-name': `<a href="..." aria-label="Read more about accessibility">Read more</a>`,
    'color-contrast': `/* Change text color for better contrast */\n.text { color: #1a1a1a; /* 16.9:1 ratio */ }`,
    'label': `<label htmlFor="email">Email Address</label>\n<input id="email" type="email" />`
  }

  return fixes[issue.rule] || `// Fix for ${issue.rule}\n// Add appropriate ARIA attributes or semantic HTML`
}

function getSimpleExplanation(issue: any): string {
  const explanations: Record<string, string> = {
    'image-alt': 'Add a text description so screen readers can describe the image to users who can\'t see it',
    'button-name': 'Make sure every button has clear text or a label so people know what it does',
    'color-contrast': 'Use darker text on light backgrounds so everyone can read it easily',
    'label': 'Add labels to form fields so people know what information to enter'
  }
  return explanations[issue.rule] || 'This needs to be fixed for accessibility'
}

function getTechnicalExplanation(issue: any): string {
  const explanations: Record<string, string> = {
    'image-alt': 'Add alt attribute with descriptive text. Use alt="" for decorative images.',
    'button-name': 'Ensure <button> has text content or aria-label. Avoid empty buttons or icon-only without labels.',
    'color-contrast': 'Achieve 4.5:1 contrast ratio for normal text, 3:1 for large text (WCAG AA)',
    'label': 'Associate <label> with <input> via for/id attributes or wrap input inside label'
  }
  return explanations[issue.rule] || 'Follow WCAG 2.2 Level AA guidelines'
}

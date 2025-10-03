/**
 * Webflow API Client
 * Handles OAuth, API requests, and auto-fix operations for Webflow sites
 */

import { createClient } from '@/app/lib/supabase/server'

// Webflow API Configuration
const WEBFLOW_AUTH_URL = 'https://webflow.com/oauth/authorize'
const WEBFLOW_TOKEN_URL = 'https://api.webflow.com/oauth/access_token'
const WEBFLOW_API_BASE = 'https://api.webflow.com/v2'

export interface WebflowConnection {
  id: string
  team_id: string
  site_id: string | null
  platform_site_id: string | null
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  status: 'connected' | 'disconnected' | 'error' | 'expired'
}

export interface WebflowSite {
  id: string
  displayName: string
  shortName: string
  previewUrl: string
  customDomains: Array<{ url: string }>
}

export interface WebflowDOMElement {
  id: string
  type: string
  tag: string
  classes: string[]
  children: WebflowDOMElement[]
  text?: string
  attributes?: Record<string, string>
}

export interface WebflowFixPreview {
  issueType: string
  wcagCriteria: string[]
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
  elementSelector: string
  beforeValue: string
  afterValue: string
  explanation: string
  canAutoFix: boolean
  requiresManual: boolean
  manualReason?: string
}

/**
 * Generate OAuth authorization URL
 */
export function getWebflowAuthUrl(teamId: string, redirectUri: string): string {
  const clientId = process.env.WEBFLOW_CLIENT_ID
  if (!clientId) {
    throw new Error('WEBFLOW_CLIENT_ID not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'sites:read sites:write assets:read assets:write',
    state: teamId // Pass teamId as state for security
  })

  return `${WEBFLOW_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const clientId = process.env.WEBFLOW_CLIENT_ID
  const clientSecret = process.env.WEBFLOW_CLIENT_SECRET
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/webflow/callback'

  if (!clientId || !clientSecret) {
    throw new Error('Webflow credentials not configured')
  }

  const response = await fetch(WEBFLOW_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ [Webflow] Token exchange failed:', error)
    throw new Error('Failed to exchange code for token')
  }

  return response.json()
}

/**
 * Refresh an expired access token
 */
export async function refreshWebflowToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const clientId = process.env.WEBFLOW_CLIENT_ID
  const clientSecret = process.env.WEBFLOW_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Webflow credentials not configured')
  }

  const response = await fetch(WEBFLOW_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })

  if (!response.ok) {
    throw new Error('Failed to refresh token')
  }

  return response.json()
}

/**
 * Get Webflow connection for a team (with automatic token refresh)
 */
export async function getWebflowConnection(teamId: string, siteId?: string): Promise<WebflowConnection | null> {
  const supabase = await createClient()
  
  const query = supabase
    .from('platform_connections')
    .select('*')
    .eq('team_id', teamId)
    .eq('platform', 'webflow')
    .eq('status', 'connected')
  
  if (siteId) {
    query.eq('site_id', siteId)
  } else {
    query.is('site_id', null) // Team-level connection
  }

  const { data, error } = await query.single()

  if (error || !data) {
    console.log('ℹ️ [Webflow] No connection found for team:', teamId)
    return null
  }

  // Check if token is expired and refresh if needed
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
    console.log('🔄 [Webflow] Token expired, refreshing...')
    try {
      const newTokens = await refreshWebflowToken(data.refresh_token)
      
      // Update connection with new tokens
      const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
      
      await supabase
        .from('platform_connections')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id)

      data.access_token = newTokens.access_token
      data.refresh_token = newTokens.refresh_token
      data.token_expires_at = expiresAt
      
      console.log('✅ [Webflow] Token refreshed successfully')
    } catch (error) {
      console.error('❌ [Webflow] Failed to refresh token:', error)
      
      // Mark connection as expired
      await supabase
        .from('platform_connections')
        .update({ status: 'expired', error_message: 'Token refresh failed' })
        .eq('id', data.id)
      
      return null
    }
  }

  return data as WebflowConnection
}

/**
 * Make an authenticated request to Webflow API
 */
async function webflowRequest<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${WEBFLOW_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'accept-version': '1.0.0',
      ...options.headers
    }
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`❌ [Webflow API] ${endpoint} failed:`, error)
    throw new Error(`Webflow API error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get sites accessible by the authenticated user
 */
export async function getWebflowSites(accessToken: string): Promise<WebflowSite[]> {
  const data = await webflowRequest<{ sites: WebflowSite[] }>('/sites', accessToken)
  return data.sites || []
}

/**
 * Get site DOM structure
 */
export async function getWebflowSiteDOM(siteId: string, accessToken: string): Promise<WebflowDOMElement> {
  return webflowRequest<WebflowDOMElement>(`/sites/${siteId}/dom`, accessToken)
}

/**
 * Update an element in Webflow
 */
export async function updateWebflowElement(
  siteId: string,
  elementId: string,
  updates: Record<string, any>,
  accessToken: string
): Promise<void> {
  await webflowRequest(
    `/sites/${siteId}/dom/nodes/${elementId}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }
  )
}

/**
 * Publish Webflow site
 */
export async function publishWebflowSite(siteId: string, accessToken: string): Promise<void> {
  await webflowRequest(
    `/sites/${siteId}/publish`,
    accessToken,
    { method: 'POST' }
  )
}

/**
 * Generate fix previews for top auto-fixable issues
 */
export async function generateWebflowFixPreviews(
  issues: any[],
  connection: WebflowConnection
): Promise<WebflowFixPreview[]> {
  console.log(`🔍 [Webflow] Analyzing ${issues.length} issues for auto-fix potential`)

  const previews: WebflowFixPreview[] = []
  
  // Sort by severity and filter for auto-fixable types
  const autoFixableTypes = [
    'image-alt', // Missing alt text
    'button-name', // Missing button labels
    'link-name', // Missing link text
    'label', // Missing form labels
    'aria-required-attr' // Missing ARIA attributes
  ]

  const candidateIssues = issues
    .filter(issue => {
      const ruleId = String(issue.rule_id || issue.id || '').toLowerCase()
      return autoFixableTypes.some(type => ruleId.includes(type))
    })
    .sort((a, b) => {
      const severityOrder: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 }
      return (severityOrder[a.impact] ?? 99) - (severityOrder[b.impact] ?? 99)
    })
    .slice(0, 3) // Top 3 issues

  for (const issue of candidateIssues) {
    const ruleId = String(issue.rule_id || issue.id || '').toLowerCase()
    const node = issue.nodes?.[0]
    
    if (!node) continue

    let preview: WebflowFixPreview | null = null

    // Image alt text
    if (ruleId.includes('image-alt')) {
      preview = {
        issueType: 'image-alt',
        wcagCriteria: ['1.1.1'],
        severity: issue.impact,
        elementSelector: node.target?.join(' > ') || 'img',
        beforeValue: '<img src="..." />',
        afterValue: '<img src="..." alt="Descriptive text" />',
        explanation: 'Add descriptive alt text to images for screen readers. The alt text should describe the image\'s content and purpose.',
        canAutoFix: false, // Requires human description
        requiresManual: true,
        manualReason: 'Alt text must be meaningful and describe the image content. AI cannot reliably generate accurate descriptions.'
      }
    }
    
    // Button name
    else if (ruleId.includes('button-name')) {
      preview = {
        issueType: 'button-name',
        wcagCriteria: ['4.1.2'],
        severity: issue.impact,
        elementSelector: node.target?.join(' > ') || 'button',
        beforeValue: '<button></button>',
        afterValue: '<button aria-label="Submit form">Submit</button>',
        explanation: 'Add accessible text or label to the button so screen readers can announce its purpose.',
        canAutoFix: false,
        requiresManual: true,
        manualReason: 'Button labels should describe the action. Context is needed to generate meaningful labels.'
      }
    }

    // Link name
    else if (ruleId.includes('link-name')) {
      preview = {
        issueType: 'link-name',
        wcagCriteria: ['4.1.2', '2.4.4'],
        severity: issue.impact,
        elementSelector: node.target?.join(' > ') || 'a',
        beforeValue: '<a href="..."></a>',
        afterValue: '<a href="..." aria-label="Learn more about services">Learn More</a>',
        explanation: 'Add descriptive text or aria-label to links so users understand where they lead.',
        canAutoFix: false,
        requiresManual: true,
        manualReason: 'Link text should describe the destination. Requires human review of context.'
      }
    }

    if (preview) {
      previews.push(preview)
    }
  }

  console.log(`✅ [Webflow] Generated ${previews.length} fix previews`)
  return previews
}

/**
 * Check if Webflow integration is enabled (not just configured)
 */
export function isWebflowEnabled(): boolean {
  return process.env.WEBFLOW_AUTO_FIX_ENABLED === 'true'
}

/**
 * Check if we're in dry-run mode
 */
export function isWebflowDryRun(): boolean {
  return process.env.WEBFLOW_DRY_RUN !== 'false' // Default to dry-run for safety
}


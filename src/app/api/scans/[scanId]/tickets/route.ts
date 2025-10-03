/**
 * Bulk Ticket Creation API
 * POST /api/scans/:scanId/tickets
 * 
 * Creates tickets for selected issue groups in GitHub or Jira
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { auth } from '@/auth'
import { verifyScanOwnership } from '@/app/lib/ownership'
import {
  createTicket,
  generateTicketTitle,
  generateTicketBody,
  type IssueGroup,
  type TicketProviderConfig,
  type CreateTicketResult,
} from '@/lib/ticket-service'
import { scanAnalytics } from '@/lib/safe-analytics'

interface RouteContext {
  params: Promise<{ scanId: string }>
}

interface CreateTicketsRequest {
  provider_id: string
  rule_ids: string[] // e.g., ["color-contrast", "link-name"]
  dry_run?: boolean
}

interface TicketPreview {
  rule: string
  title: string
  body: string
  count: number
  examples: Array<{ selector: string; html: string }>
}

interface CreateTicketsResponse {
  success: boolean
  dry_run?: boolean
  preview?: TicketPreview[]
  created?: Array<{
    rule: string
    ticket_url: string
    ticket_key: string
  }>
  failed?: Array<{
    rule: string
    error: string
  }>
  error?: string
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const startTime = Date.now()
  const params = await context.params
  const { scanId } = params

  try {
    console.log(`🎫 [tickets] Starting bulk ticket creation for scan: ${scanId}`)

    // Parse request body
    const body: CreateTicketsRequest = await request.json()
    const { provider_id, rule_ids, dry_run = false } = body

    // Validate input
    if (!provider_id) {
      return NextResponse.json(
        { success: false, error: 'provider_id is required' },
        { status: 400 }
      )
    }

    if (!rule_ids || rule_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one rule_id is required' },
        { status: 400 }
      )
    }

    if (rule_ids.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Maximum 20 rules can be processed at once' },
        { status: 400 }
      )
    }

    // Emit telemetry
    scanAnalytics.track('tickets_create_started', {
      scanId,
      provider_id,
      rule_count: rule_ids.length,
      dry_run,
    })

    // Verify authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Initialize Supabase
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify scan ownership
    const ownershipResult = await verifyScanOwnership(userId, scanId, '🎫 [tickets]')

    if (!ownershipResult.allowed || !ownershipResult.site) {
      console.error(`🎫 [tickets] Ownership check failed:`, ownershipResult.error)
      scanAnalytics.track('tickets_create_failed', {
        scanId,
        error_type: 'unauthorized',
      })
      return NextResponse.json(
        { success: false, error: ownershipResult.error?.message || 'Access denied' },
        { status: ownershipResult.error?.httpStatus || 403 }
      )
    }

    const site = ownershipResult.site
    const teamId = site.team_id

    // Fetch scan data
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('id, status, created_at')
      .eq('id', scanId)
      .single()

    if (scanError || !scan) {
      console.error(`🎫 [tickets] Failed to fetch scan:`, scanError)
      return NextResponse.json(
        { success: false, error: 'Scan not found' },
        { status: 404 }
      )
    }

    // Fetch provider configuration
    const { data: provider, error: providerError } = await supabase
      .from('ticket_providers')
      .select('*')
      .eq('id', provider_id)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .single()

    if (providerError || !provider) {
      console.error(`🎫 [tickets] Provider not found:`, providerError)
      return NextResponse.json(
        { success: false, error: 'Ticket provider not found or inactive' },
        { status: 404 }
      )
    }

    // Fetch issues grouped by rule
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('id, rule, impact, description, help_url, selector, html')
      .eq('scan_id', scanId)
      .in('rule', rule_ids)
      .order('impact', { ascending: false })

    if (issuesError) {
      console.error(`🎫 [tickets] Failed to fetch issues:`, issuesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch issues' },
        { status: 500 }
      )
    }

    if (!issues || issues.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No issues found for the selected rules' },
        { status: 404 }
      )
    }

    // Group issues by rule
    const issueGroups = new Map<string, IssueGroup>()

    for (const issue of issues) {
      if (!issueGroups.has(issue.rule)) {
        issueGroups.set(issue.rule, {
          rule: issue.rule,
          impact: issue.impact || 'moderate',
          description: issue.description || '',
          help_url: issue.help_url || '',
          count: 0,
          instances: [],
        })
      }

      const group = issueGroups.get(issue.rule)!
      group.count++
      group.instances.push({
        selector: issue.selector || '',
        html: issue.html || '',
      })
    }

    console.log(`🎫 [tickets] Grouped ${issues.length} issues into ${issueGroups.size} rules`)

    // Generate report URL
    const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.auditvia.com'}/dashboard/scans/${scanId}`

    // DRY RUN: Return preview
    if (dry_run) {
      const preview: TicketPreview[] = Array.from(issueGroups.values()).map((group) => ({
        rule: group.rule,
        title: generateTicketTitle(site.name || 'Unknown Site', group.rule, group.count),
        body: generateTicketBody(site.url, scanId, reportUrl, group),
        count: group.count,
        examples: group.instances.slice(0, 3),
      }))

      scanAnalytics.track('tickets_preview_generated', {
        scanId,
        provider_id,
        rule_count: preview.length,
      })

      return NextResponse.json<CreateTicketsResponse>({
        success: true,
        dry_run: true,
        preview,
      })
    }

    // REAL RUN: Create tickets
    const created: Array<{ rule: string; ticket_url: string; ticket_key: string }> = []
    const failed: Array<{ rule: string; error: string }> = []

    for (const [ruleId, group] of issueGroups) {
      console.log(`🎫 [tickets] Creating ticket for rule: ${ruleId}`)

      // Generate ticket payload
      const title = generateTicketTitle(site.name || 'Unknown Site', ruleId, group.count)
      const body = generateTicketBody(site.url, scanId, reportUrl, group)

      const payload = {
        title,
        body,
        labels: provider.provider_type === 'github' ? ['accessibility', 'bug'] : undefined,
      }

      // Create ticket via provider API
      const result: CreateTicketResult = await createTicket(
        provider as unknown as TicketProviderConfig,
        payload
      )

      if (result.success && result.ticket_url && result.ticket_key) {
        // Store ticket in database
        const { error: insertError } = await supabase.from('tickets').insert({
          team_id: teamId,
          scan_id: scanId,
          issue_rule: ruleId,
          provider_id: provider.id,
          provider_type: provider.provider_type,
          ticket_url: result.ticket_url,
          ticket_key: result.ticket_key,
          title,
          body,
          issue_count: group.count,
          example_selectors: group.instances.slice(0, 3).map((i) => i.selector),
          created_by: userId,
        })

        if (insertError) {
          console.error(`🎫 [tickets] Failed to store ticket for ${ruleId}:`, insertError)
          failed.push({ rule: ruleId, error: 'Failed to store ticket in database' })
        } else {
          created.push({
            rule: ruleId,
            ticket_url: result.ticket_url,
            ticket_key: result.ticket_key,
          })
        }
      } else {
        failed.push({ rule: ruleId, error: result.error || 'Unknown error' })
      }
    }

    // Update provider last_used_at
    await supabase
      .from('ticket_providers')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', provider_id)

    const duration = Date.now() - startTime

    console.log(
      `🎫 [tickets] Completed in ${duration}ms: ${created.length} created, ${failed.length} failed`
    )

    scanAnalytics.track('tickets_create_completed', {
      scanId,
      provider_id,
      created_count: created.length,
      failed_count: failed.length,
      duration_ms: duration,
    })

    return NextResponse.json<CreateTicketsResponse>({
      success: true,
      created,
      failed: failed.length > 0 ? failed : undefined,
    })
  } catch (error: any) {
    console.error(`🎫 [tickets] Exception:`, error)

    scanAnalytics.track('tickets_create_failed', {
      scanId,
      error_type: 'exception',
      error_message: error.message,
    })

    return NextResponse.json<CreateTicketsResponse>(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/scans/:scanId/tickets
 * Fetch existing tickets for a scan
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const { scanId } = params

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify ownership
    const ownershipResult = await verifyScanOwnership(userId, scanId)
    if (!ownershipResult.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch tickets
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('scan_id', scanId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch tickets:', error)
      return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
    }

    return NextResponse.json({ tickets: tickets || [] })
  } catch (error: any) {
    console.error('Exception fetching tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

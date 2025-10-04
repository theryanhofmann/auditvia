import { NextRequest, NextResponse } from 'next/server'
import { resolveTeamForRequest } from '@/lib/team-resolution'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/notifications
 * Returns notifications for the current user's team
 */
export async function GET(_request: NextRequest) {
  try {
    console.log('[Notifications API] Starting request')
    
    // Use centralized team resolution (creates team if needed)
    const resolution = await resolveTeamForRequest(undefined, true)
    
    if (!resolution) {
      console.log('[Notifications API] Team resolution failed')
      return NextResponse.json({ error: 'Could not resolve team' }, { status: 500 })
    }

    console.log('[Notifications API] Team resolved:', {
      teamId: resolution.teamId,
      userId: resolution.userId,
      source: resolution.source,
      created: resolution.created
    })

    // Use service role to bypass RLS for fetching activity data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate notifications based on real data
    const notifications = await generateNotificationsFromActivity(
      supabase,
      resolution.teamId,
      resolution.userId
    )

    console.log('[Notifications API] Generated notifications:', notifications.length)

    return NextResponse.json({
      notifications,
      total: notifications.length,
      unread: notifications.filter((n: any) => !n.read).length
    })
  } catch (error) {
    console.error('[Notifications API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * Generate notifications from recent activity
 * This is a temporary implementation until we have a proper notifications table
 */
async function generateNotificationsFromActivity(supabase: SupabaseClient, teamId: string, _userId: string) {
  const notifications: any[] = []

  // First get all sites for this team
  const { data: teamSites, error: sitesError } = await supabase
    .from('sites')
    .select('id, name, url')
    .eq('team_id', teamId)

  if (sitesError) {
    console.error('[Notifications] Error fetching sites:', sitesError)
    return notifications
  }

  if (!teamSites || teamSites.length === 0) {
    console.log('[Notifications] No sites found for team:', teamId)
    return notifications
  }

  console.log('[Notifications] Found sites:', teamSites.length)

  const siteIds = teamSites.map((s: { id: string }) => s.id)
  const siteMap = new Map<string, { id: string; name: string | null; url: string }>(
    teamSites.map((s: { id: string; name: string | null; url: string }) => [s.id, s as { id: string; name: string | null; url: string }])
  )

  // Fetch recent scans for team's sites
  const { data: recentScans } = await supabase
    .from('scans')
    .select('id, status, created_at, total_violations, site_id')
    .in('site_id', siteIds)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20)

  if (recentScans) {
    for (const scan of recentScans) {
      const site = siteMap.get(scan.site_id)
      if (!site) continue

      const issuesCount = scan.total_violations || 0
      const isRecent = new Date(scan.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      const siteName = site.name || new URL(site.url).hostname

      // Scan completion notification
      notifications.push({
        id: `scan_${scan.id}`,
        type: 'scan',
        title: `Scan completed: ${siteName}`,
        message: issuesCount > 0
          ? `Scan completed with ${issuesCount} accessibility issue${issuesCount !== 1 ? 's' : ''} detected.`
          : 'Scan completed successfully with no accessibility issues found.',
        site: siteName,
        siteUrl: site.url,
        scanId: scan.id,
        severity: issuesCount > 10 ? 'serious' : issuesCount > 5 ? 'moderate' : issuesCount > 0 ? 'minor' : undefined,
        impact: {
          count: issuesCount,
          scoreDelta: 0
        },
        createdAt: scan.created_at,
        read: !isRecent,
        actions: [
          {
            type: 'route',
            label: 'View Report',
            href: `/dashboard/scans/${scan.id}`,
            primary: true
          },
          {
            type: 'route',
            label: 'View Site',
            href: `/dashboard/sites/${site.id}/history?teamId=${teamId}`
          }
        ]
      })
    }
  }

  // Fetch critical/serious issues from recent scans
  if (recentScans && recentScans.length > 0) {
    const scanIds = recentScans.map((s: { id: string }) => s.id)
    
    const { data: criticalIssues } = await supabase
      .from('issues')
      .select('id, rule, impact, selector, description, scan_id, created_at')
      .in('scan_id', scanIds)
      .in('impact', ['critical', 'serious'])
      .order('created_at', { ascending: false })
      .limit(15)

    if (criticalIssues && criticalIssues.length > 0) {
      // Group issues by rule for each scan
      const issueGroups = new Map<string, any[]>()

      for (const issue of criticalIssues) {
        const scan = recentScans.find((s: { id: string }) => s.id === issue.scan_id)
        if (!scan) continue

        const site = siteMap.get(scan.site_id)
        if (!site) continue

        const key = `${issue.rule}_${scan.site_id}`
        if (!issueGroups.has(key)) {
          issueGroups.set(key, [])
        }
        issueGroups.get(key)!.push({ ...issue, scan, site })
      }

      // Create notifications for high-priority issue groups
      for (const [key, issues] of issueGroups) {
        const firstIssue = issues[0]
        const count = issues.length
        const isRecent = new Date(firstIssue.created_at) > new Date(Date.now() - 12 * 60 * 60 * 1000)
        const siteName = firstIssue.site.name || new URL(firstIssue.site.url).hostname

        notifications.push({
          id: `violation_${key}_${firstIssue.scan.id}`,
          type: 'violation',
          title: `${count} ${firstIssue.impact} issue${count !== 1 ? 's' : ''}: ${firstIssue.rule}`,
          message: firstIssue.description || getRuleDescription(firstIssue.rule),
          severity: firstIssue.impact,
          site: siteName,
          siteUrl: firstIssue.site.url,
          rule: firstIssue.rule,
          ruleDescription: getRuleDescription(firstIssue.rule),
          selector: firstIssue.selector,
          scanId: firstIssue.scan.id,
          createdAt: firstIssue.created_at,
          read: !isRecent,
          actions: [
            {
              type: 'route',
              label: 'View Details',
              href: `/dashboard/scans/${firstIssue.scan.id}`,
              primary: true
            },
            {
              type: 'route',
              label: 'Fix Center',
              href: '/dashboard/violations'
            }
          ]
        })
      }
    }
  }

  // Sort by created_at descending
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return notifications
}

/**
 * Get human-readable description for a rule
 */
function getRuleDescription(ruleId: string): string {
  const descriptions: Record<string, string> = {
    'aria-prohibited-attr': "ARIA attributes are prohibited for the element's role",
    'color-contrast': 'Text contrast does not meet WCAG 2 AA requirements (4.5:1)',
    'link-name': 'Links must have discernible text',
    'button-name': 'Buttons must have discernible text',
    'image-alt': 'Images must have alt text or appropriate role',
    'label': 'Form elements must have associated labels',
    'heading-order': 'Heading order should be semantically correct',
    'duplicate-id': 'IDs must be unique on the page',
    'form-field-multiple-labels': 'Form fields should not have multiple labels',
    'aria-required-attr': 'Required ARIA attributes are missing',
    'tabindex': 'Tabindex values should not be greater than 0',
    'landmark-one-main': 'Page should have one main landmark',
    'region': 'All page content should be contained by landmarks'
  }

  return descriptions[ruleId] || 'Accessibility issue detected'
}



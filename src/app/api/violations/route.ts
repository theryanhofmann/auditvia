import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity')

    // Get user's team
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (!memberships) {
      return NextResponse.json({ error: 'No team found' }, { status: 404 })
    }

    const teamId = memberships.team_id

    // Get all sites for this team
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name, url')
      .eq('team_id', teamId)

    if (!sites || sites.length === 0) {
      return NextResponse.json({ violations: [], kpis: getEmptyKPIs() })
    }

    const siteIds = sites.map(s => s.id)

    // Get all scans for these sites
    const { data: scans } = await supabase
      .from('scans')
      .select('id, site_id, status, created_at')
      .in('site_id', siteIds)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })

    if (!scans || scans.length === 0) {
      return NextResponse.json({ violations: [], kpis: getEmptyKPIs() })
    }

    const scanIds = scans.map(s => s.id)

    // Build issues query
    let issuesQuery = supabase
      .from('issues')
      .select(`
        id,
        scan_id,
        rule,
        selector,
        severity,
        impact,
        description,
        help_url,
        html,
        created_at,
        github_issue_url,
        github_issue_number,
        github_issue_created_at
      `)
      .in('scan_id', scanIds)

    if (severity) {
      issuesQuery = issuesQuery.eq('severity', severity)
    }

    const { data: issues, error: issuesError } = await issuesQuery

    if (issuesError) {
      console.error('Error fetching issues:', issuesError)
      return NextResponse.json({ error: 'Failed to fetch violations' }, { status: 500 })
    }

    if (!issues || issues.length === 0) {
      return NextResponse.json({ violations: [], kpis: getEmptyKPIs(), issues: [] })
    }

    // Transform issues to include site information for Fix Center
    const issuesWithSites = issues.map(issue => {
      const scan = scans.find(s => s.id === issue.scan_id)
      const site = scan ? sites.find(s => s.id === scan.site_id) : null
      
      return {
        id: issue.id,
        rule: issue.rule,
        description: issue.description || formatRuleName(issue.rule),
        impact: (issue.impact || issue.severity || 'moderate') as 'critical' | 'serious' | 'moderate' | 'minor',
        selector: issue.selector,
        help_url: issue.help_url || '',
        wcag_ref: extractWCAGRef(issue.help_url),
        site_id: scan?.site_id || '',
        site_name: site?.name || site?.url || 'Unknown site'
      }
    })

    // Group issues by rule and aggregate for violations list
    const violationMap = new Map<string, any>()

    for (const issue of issues) {
      const key = issue.rule
      
      if (!violationMap.has(key)) {
        // Determine status based on GitHub issue
        let violationStatus = 'open'
        if (issue.github_issue_url) {
          // If there's a GitHub issue, consider it as being worked on (still open)
          violationStatus = 'open'
          // In a real system, you'd check the GitHub issue state
        }

        violationMap.set(key, {
          id: key,
          rule: issue.rule,
          ruleName: formatRuleName(issue.rule),
          severity: issue.severity || issue.impact || 'moderate',
          affectedSites: new Set<string>(),
          instances: 0,
          status: violationStatus,
          lastSeen: issue.created_at,
          wcagRef: extractWCAGRef(issue.help_url),
          description: issue.description || '',
          helpUrl: issue.help_url || '',
          scanIds: new Set<string>(),
        })
      }

      const violation = violationMap.get(key)
      violation.instances++
      violation.scanIds.add(issue.scan_id)
      
      // Update last seen if newer
      if (new Date(issue.created_at) > new Date(violation.lastSeen)) {
        violation.lastSeen = issue.created_at
      }
    }

    // Convert sets to counts and add affected sites
    const violations = Array.from(violationMap.values()).map(v => {
      // Count unique sites from scan IDs
      const affectedSiteIds = new Set<string>()
      for (const scanId of v.scanIds) {
        const scan = scans.find(s => s.id === scanId)
        if (scan) {
          affectedSiteIds.add(scan.site_id)
        }
      }
      
      return {
        id: v.id,
        rule: v.rule,
        ruleName: v.ruleName,
        severity: v.severity,
        affectedSites: affectedSiteIds.size,
        instances: v.instances,
        status: v.status,
        lastSeen: v.lastSeen,
        wcagRef: v.wcagRef,
        description: v.description,
        helpUrl: v.helpUrl,
      }
    })

    // Calculate KPIs
    const totalViolations = violations.reduce((sum, v) => sum + v.instances, 0)
    const criticalIssues = violations
      .filter(v => v.severity === 'critical')
      .reduce((sum, v) => sum + v.instances, 0)
    const fixedCount = violations
      .filter(v => v.status === 'fixed')
      .reduce((sum, v) => sum + v.instances, 0)
    const openCount = violations
      .filter(v => v.status === 'open')
      .reduce((sum, v) => sum + v.instances, 0)
    const affectedSitesSet = new Set(
      violations.flatMap(v => Array(v.affectedSites).fill(null).map((_, i) => `${v.rule}-site-${i}`))
    )

    const kpis = {
      totalViolations,
      criticalIssues,
      fixedCount,
      openCount,
      fixedPercentage: totalViolations > 0 ? (fixedCount / totalViolations) * 100 : 0,
      affectedSites: affectedSitesSet.size,
    }

    return NextResponse.json({
      violations: violations.sort((a, b) => {
        // Sort by severity priority, then by instance count
        const severityOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 }
        const aSev = severityOrder[a.severity as keyof typeof severityOrder] ?? 4
        const bSev = severityOrder[b.severity as keyof typeof severityOrder] ?? 4
        
        if (aSev !== bSev) return aSev - bSev
        return b.instances - a.instances
      }),
      kpis,
      issues: issuesWithSites
    })
  } catch (error) {
    console.error('Error in violations API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatRuleName(rule: string): string {
  // Convert rule IDs to human-readable names
  const ruleNames: Record<string, string> = {
    'image-alt': 'Images must have alternate text',
    'color-contrast': 'Elements must have sufficient color contrast',
    'label': 'Form elements must have labels',
    'link-name': 'Links must have discernible text',
    'button-name': 'Buttons must have discernible text',
    'aria-required-attr': 'Required ARIA attributes must be provided',
    'heading-order': 'Heading levels should only increase by one',
    'html-has-lang': 'HTML element must have a lang attribute',
    'document-title': 'Documents must have a title',
    'landmark-one-main': 'Page must have one main landmark',
    'region': 'Page must have regions',
    'bypass': 'Page must have means to bypass repeated blocks',
  }

  return ruleNames[rule] || rule.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function extractWCAGRef(helpUrl: string | null): string {
  if (!helpUrl) return 'WCAG 2.2'
  
  // Extract WCAG reference from help URL if possible
  // For now, return a generic reference
  // In a real system, you'd map rule IDs to specific WCAG criteria
  return 'WCAG 2.2'
}

function getEmptyKPIs() {
  return {
    totalViolations: 0,
    criticalIssues: 0,
    fixedCount: 0,
    openCount: 0,
    fixedPercentage: 0,
    affectedSites: 0,
  }
}


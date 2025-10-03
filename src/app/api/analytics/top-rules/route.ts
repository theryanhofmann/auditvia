import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Rule category mapping
const RULE_CATEGORIES: Record<string, string> = {
  'color-contrast': 'Color',
  'link-name': 'Landmark',
  'button-name': 'Landmark',
  'aria-prohibited-attr': 'ARIA',
  'aria-required-attr': 'ARIA',
  'aria-valid-attr': 'ARIA',
  'label': 'Forms',
  'form-field-multiple-labels': 'Forms',
  'image-alt': 'Media',
  'video-caption': 'Media',
  'tabindex': 'Keyboard',
  'accesskeys': 'Keyboard'
}

// Severity risk weights
const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 200,
  serious: 80,
  moderate: 40,
  minor: 10
}

/**
 * GET /api/analytics/top-rules
 * Returns top rules ranked by impact (count × severity weight)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30'

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Get sites for this team
    const { data: sites } = await supabase
      .from('sites')
      .select('id')
      .eq('team_id', membership.team_id)

    if (!sites || sites.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const siteIds = sites.map(s => s.id)
    const daysBack = parseInt(range) || 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    // Get all issues in range
    const { data: issues } = await supabase
      .from('issues')
      .select(`
        rule_id,
        impact,
        scans!inner(
          site_id,
          sites!inner(team_id)
        )
      `)
      .in('scans.site_id', siteIds)
      .gte('created_at', startDate.toISOString())

    if (!issues || issues.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Group by rule
    const ruleMap = new Map<string, any>()

    issues.forEach((issue: any) => {
      const ruleId = issue.rule_id
      const severity = issue.impact?.toLowerCase() || 'minor'
      const siteId = issue.scans?.site_id

      if (!ruleMap.has(ruleId)) {
        ruleMap.set(ruleId, {
          ruleId,
          ruleName: formatRuleName(ruleId),
          category: RULE_CATEGORIES[ruleId] || 'Other',
          severity,
          count: 0,
          riskScore: 0,
          sites: new Set<string>(),
          pages: 0
        })
      }

      const rule = ruleMap.get(ruleId)
      rule.count++
      rule.riskScore += SEVERITY_WEIGHTS[severity] || 10
      if (siteId) rule.sites.add(siteId)
    })

    // Convert to array and sort by risk score
    const data = Array.from(ruleMap.values())
      .map(rule => ({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        category: rule.category,
        severity: rule.severity,
        count: rule.count,
        riskScore: rule.riskScore,
        sites: rule.sites.size,
        pages: Math.floor(rule.count / 2) // Estimate pages (rough heuristic)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20) // Top 20

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching top rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch top rules' },
      { status: 500 }
    )
  }
}

function formatRuleName(ruleId: string): string {
  return ruleId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}


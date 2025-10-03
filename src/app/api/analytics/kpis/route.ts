import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/kpis
 * Returns KPI metrics for the current user's team
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

    // Calculate date range
    const daysBack = parseInt(range) || 30
    const currentPeriodStart = new Date()
    currentPeriodStart.setDate(currentPeriodStart.getDate() - daysBack)
    
    const previousPeriodStart = new Date(currentPeriodStart)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysBack)
    const previousPeriodEnd = currentPeriodStart

    // Get sites for this team
    const { data: sites } = await supabase
      .from('sites')
      .select('id')
      .eq('team_id', membership.team_id)

    if (!sites || sites.length === 0) {
      return NextResponse.json({
        openViolations: { value: 0, delta: 0, sparklineData: [] },
        avgScore: { value: 100, delta: 0, sparklineData: [] },
        fixVelocity: { value: 0, delta: 0, sparklineData: [] },
        mttr: { value: 0, delta: 0, sparklineData: [] }
      })
    }

    const siteIds = sites.map(s => s.id)

    // 1. Open Violations (current vs previous period)
    const { data: currentIssues } = await supabase
      .from('issues')
      .select('id, scans!inner(sites!inner(team_id))')
      .in('scans.site_id', siteIds)
      .is('github_issue_url', null) // Not fixed
      .gte('created_at', currentPeriodStart.toISOString())

    const { data: previousIssues } = await supabase
      .from('issues')
      .select('id, scans!inner(sites!inner(team_id))')
      .in('scans.site_id', siteIds)
      .is('github_issue_url', null)
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', previousPeriodEnd.toISOString())

    const openViolationsCount = currentIssues?.length || 0
    const previousViolationsCount = previousIssues?.length || 0
    const violationsDelta = previousViolationsCount > 0
      ? ((openViolationsCount - previousViolationsCount) / previousViolationsCount) * 100
      : 0

    // 2. Average Compliance Score
    const { data: currentScans } = await supabase
      .from('scans')
      .select('summary_json')
      .in('site_id', siteIds)
      .eq('status', 'completed')
      .gte('created_at', currentPeriodStart.toISOString())
      .order('created_at', { ascending: false })

    const { data: previousScans } = await supabase
      .from('scans')
      .select('summary_json')
      .in('site_id', siteIds)
      .eq('status', 'completed')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', previousPeriodEnd.toISOString())

    const currentAvgScore = currentScans?.length
      ? currentScans.reduce((sum, scan) => {
          const summary = scan.summary_json as any
          return sum + (summary?.score || 0)
        }, 0) / currentScans.length
      : 0

    const previousAvgScore = previousScans?.length
      ? previousScans.reduce((sum, scan) => {
          const summary = scan.summary_json as any
          return sum + (summary?.score || 0)
        }, 0) / previousScans.length
      : 0

    const scoreDelta = previousAvgScore > 0
      ? ((currentAvgScore - previousAvgScore) / previousAvgScore) * 100
      : 0

    // 3. Fix Velocity (issues with github_issue_url set in current period)
    const { data: fixedIssues } = await supabase
      .from('issues')
      .select('id, created_at, scans!inner(sites!inner(team_id))')
      .in('scans.site_id', siteIds)
      .not('github_issue_url', 'is', null)
      .gte('created_at', currentPeriodStart.toISOString())

    const { data: previousFixedIssues } = await supabase
      .from('issues')
      .select('id, scans!inner(sites!inner(team_id))')
      .in('scans.site_id', siteIds)
      .not('github_issue_url', 'is', null)
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', previousPeriodEnd.toISOString())

    const currentFixVelocity = (fixedIssues?.length || 0) / (daysBack / 7)
    const previousFixVelocity = (previousFixedIssues?.length || 0) / (daysBack / 7)
    const velocityDelta = previousFixVelocity > 0
      ? ((currentFixVelocity - previousFixVelocity) / previousFixVelocity) * 100
      : 0

    // 4. MTTR (Mean Time To Resolve) - for issues that have been fixed
    // This is a simplified calculation; in production you'd track fix timestamps
    const mttr = 4.2 // Placeholder - would need fix timestamp tracking
    const mttrDelta = -15.3 // Placeholder

    // Generate sparkline data (last 7 days)
    const violationsSparkline = await generateSparkline(supabase, siteIds, 'violations', 7)
    const scoreSparkline = await generateSparkline(supabase, siteIds, 'score', 7)
    const velocitySparkline = await generateSparkline(supabase, siteIds, 'fixes', 7)

    return NextResponse.json({
      openViolations: {
        value: openViolationsCount,
        delta: violationsDelta,
        sparklineData: violationsSparkline
      },
      avgScore: {
        value: currentAvgScore,
        delta: scoreDelta,
        sparklineData: scoreSparkline
      },
      fixVelocity: {
        value: currentFixVelocity,
        delta: velocityDelta,
        sparklineData: velocitySparkline
      },
      mttr: {
        value: mttr,
        delta: mttrDelta,
        sparklineData: [5.2, 5.0, 4.8, 4.6, 4.5, 4.3, 4.2]
      }
    })
  } catch (error) {
    console.error('Error fetching KPIs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KPIs' },
      { status: 500 }
    )
  }
}

async function generateSparkline(
  supabase: any,
  siteIds: string[],
  type: 'violations' | 'score' | 'fixes',
  days: number
): Promise<number[]> {
  const data: number[] = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    
    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    if (type === 'violations') {
      const { data: issues } = await supabase
        .from('issues')
        .select('id, scans!inner(sites!inner(team_id))')
        .in('scans.site_id', siteIds)
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString())
      
      data.push(issues?.length || 0)
    } else if (type === 'score') {
      const { data: scans } = await supabase
        .from('scans')
        .select('summary_json')
        .in('site_id', siteIds)
        .eq('status', 'completed')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString())
      
      const avgScore = scans?.length
        ? scans.reduce((sum: number, scan: any) => {
            const summary = scan.summary_json as any
            return sum + (summary?.score || 0)
          }, 0) / scans.length
        : 0
      
      data.push(avgScore)
    } else if (type === 'fixes') {
      const { data: fixes } = await supabase
        .from('issues')
        .select('id, scans!inner(sites!inner(team_id))')
        .in('scans.site_id', siteIds)
        .not('github_issue_url', 'is', null)
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString())
      
      data.push(fixes?.length || 0)
    }
  }

  return data
}


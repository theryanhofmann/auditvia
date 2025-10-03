import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/violations-trend
 * Returns violations over time, grouped by severity
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

    // Determine bucket size (daily for <30 days, weekly for 30+)
    const bucketDays = daysBack < 30 ? 1 : 7
    const numBuckets = Math.ceil(daysBack / bucketDays)

    const data = []

    for (let i = 0; i < numBuckets; i++) {
      const bucketStart = new Date(startDate)
      bucketStart.setDate(bucketStart.getDate() + (i * bucketDays))
      
      const bucketEnd = new Date(bucketStart)
      bucketEnd.setDate(bucketEnd.getDate() + bucketDays)

      // Get issues created in this bucket
      const { data: issues } = await supabase
        .from('issues')
        .select('impact, scans!inner(sites!inner(team_id))')
        .in('scans.site_id', siteIds)
        .gte('created_at', bucketStart.toISOString())
        .lt('created_at', bucketEnd.toISOString())

      // Get issues closed/fixed in this bucket
      const { data: fixed } = await supabase
        .from('issues')
        .select('id, scans!inner(sites!inner(team_id))')
        .in('scans.site_id', siteIds)
        .not('github_issue_url', 'is', null)
        .gte('created_at', bucketStart.toISOString())
        .lt('created_at', bucketEnd.toISOString())

      // Count by severity
      const severityCounts = {
        critical: 0,
        serious: 0,
        moderate: 0,
        minor: 0
      }

      issues?.forEach((issue: any) => {
        const severity = issue.impact?.toLowerCase() || 'minor'
        if (severity in severityCounts) {
          severityCounts[severity as keyof typeof severityCounts]++
        }
      })

      data.push({
        date: bucketStart.toISOString().split('T')[0],
        created: issues?.length || 0,
        closed: fixed?.length || 0,
        critical: severityCounts.critical,
        serious: severityCounts.serious,
        moderate: severityCounts.moderate,
        minor: severityCounts.minor
      })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching violations trend:', error)
    return NextResponse.json(
      { error: 'Failed to fetch violations trend' },
      { status: 500 }
    )
  }
}


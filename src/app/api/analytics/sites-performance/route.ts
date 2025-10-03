import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/sites-performance
 * Returns sites with their scores, deltas, and issue counts
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

    const daysBack = parseInt(range) || 30
    const currentPeriodStart = new Date()
    currentPeriodStart.setDate(currentPeriodStart.getDate() - daysBack)
    
    const previousPeriodStart = new Date(currentPeriodStart)
    previousPeriodStart.setDate(previousPeriodStart.getDate() - daysBack)

    // Get sites for this team
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name, url')
      .eq('team_id', membership.team_id)

    if (!sites || sites.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const data = []

    for (const site of sites) {
      // Get most recent scan in current period
      const { data: currentScans } = await supabase
        .from('scans')
        .select('summary_json')
        .eq('site_id', site.id)
        .eq('status', 'completed')
        .gte('created_at', currentPeriodStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      // Get most recent scan in previous period
      const { data: previousScans } = await supabase
        .from('scans')
        .select('summary_json')
        .eq('site_id', site.id)
        .eq('status', 'completed')
        .gte('created_at', previousPeriodStart.toISOString())
        .lt('created_at', currentPeriodStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      const currentSummary = currentScans?.[0]?.summary_json as any
      const previousSummary = previousScans?.[0]?.summary_json as any

      const currentScore = currentSummary?.score || 0
      const previousScore = previousSummary?.score || 0
      const delta = currentScore - previousScore

      // Get issue count
      const { data: issues } = await supabase
        .from('issues')
        .select('id, scans!inner(site_id)')
        .eq('scans.site_id', site.id)
        .gte('created_at', currentPeriodStart.toISOString())

      data.push({
        name: site.name,
        score: currentScore,
        delta,
        issues: issues?.length || 0
      })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching sites performance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sites performance' },
      { status: 500 }
    )
  }
}


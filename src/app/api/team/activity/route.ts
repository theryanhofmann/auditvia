import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getUserAuditLogs } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/team/activity?userId=xxx
 * Get activity logs for a specific team member
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

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
      .select('team_id, role')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Get userId from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify the target user is in the same team
    const { data: targetMember, error: targetError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', membership.team_id)
      .eq('user_id', userId)
      .single()

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: 'Member not found in your team' },
        { status: 404 }
      )
    }

    // Get audit logs for this user
    const logs = await getUserAuditLogs(membership.team_id, userId, 20)

    // Transform for client
    const activities = logs.map((log: any) => ({
      id: log.id,
      action: log.action,
      actorEmail: log.actor?.email || 'Unknown',
      actorName: log.actor?.raw_user_meta_data?.full_name || log.actor?.email || 'Unknown',
      metadata: log.metadata,
      timestamp: log.created_at
    }))

    return NextResponse.json({ activities })
  } catch (error) {
    console.error('Error in /api/team/activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/team/members
 * Returns all team members for the current user's team
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

    // Get user's team membership
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Get all team members with user details
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        role,
        created_at,
        users (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('team_id', membership.team_id)
      .order('created_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }

    // Transform to match interface
    const transformedMembers = (members || []).map((m: any) => ({
      id: m.id,
      user_id: m.user_id,
      name: m.users?.raw_user_meta_data?.full_name || m.users?.raw_user_meta_data?.name || '',
      email: m.users?.email || '',
      role: m.role,
      status: 'active', // All team_members are active; pending would be in invites
      last_active_at: null, // Would need activity tracking
      created_at: m.created_at
    }))

    return NextResponse.json({
      members: transformedMembers,
      currentUserRole: membership.role
    })
  } catch (error) {
    console.error('Error in /api/team/members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


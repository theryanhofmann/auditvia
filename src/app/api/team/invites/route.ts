import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/team/invites
 * Returns pending invites for the current user's team
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
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Fetch pending invites from database
    const { data: invites, error: invitesError } = await supabase
      .from('team_invites')
      .select(`
        id,
        email,
        role,
        status,
        message,
        created_at,
        updated_at,
        invited_by:users!invited_by_user_id(email, raw_user_meta_data)
      `)
      .eq('team_id', membership.team_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (invitesError) {
      console.error('Failed to fetch invites:', invitesError)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    // Transform for client
    const transformedInvites = (invites || []).map((invite: any) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      invited_by: invite.invited_by?.email || 'Unknown',
      created_at: invite.created_at,
      updated_at: invite.updated_at
    }))

    return NextResponse.json({
      invites: transformedInvites
    })
  } catch (error) {
    console.error('Error in /api/team/invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


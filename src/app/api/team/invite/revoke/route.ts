import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { logTeamAction, AuditAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/team/invite/revoke
 * Revoke a pending team invitation
 */
export async function POST(request: NextRequest) {
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

    // Get user's team and role
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if user can revoke invites (owner or admin)
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to revoke invitations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { inviteId } = body

    if (!inviteId) {
      return NextResponse.json(
        { error: 'inviteId is required' },
        { status: 400 }
      )
    }

    // Get the invite
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('team_id', membership.team_id)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invitation not found or already processed' },
        { status: 404 }
      )
    }

    // Update the invite status to revoked
    const { error: updateError } = await supabase
      .from('team_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId)

    if (updateError) {
      console.error('Failed to revoke invite:', updateError)
      return NextResponse.json(
        { error: 'Failed to revoke invitation' },
        { status: 500 }
      )
    }

    // Log audit entry
    await logTeamAction({
      teamId: membership.team_id,
      actorUserId: user.id,
      action: AuditAction.INVITE_REVOKED,
      targetEmail: invite.email,
      metadata: { role: invite.role }
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully'
    })
  } catch (error) {
    console.error('Error in /api/team/invite/revoke:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


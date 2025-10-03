import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { logTeamAction, AuditAction } from '@/lib/audit'
import { sendInviteResentEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

/**
 * POST /api/team/invite/resend
 * Resend a pending team invitation
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

    // Check if user can resend invites (owner or admin)
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to resend invitations' },
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

    // Update the invite timestamp
    const { error: updateError } = await supabase
      .from('team_invites')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', inviteId)

    if (updateError) {
      console.error('Failed to update invite:', updateError)
      return NextResponse.json(
        { error: 'Failed to resend invitation' },
        { status: 500 }
      )
    }

    // Log audit entry
    await logTeamAction({
      teamId: membership.team_id,
      actorUserId: user.id,
      action: AuditAction.INVITE_RESENT,
      targetEmail: invite.email,
      metadata: { role: invite.role }
    })

    // Send invitation email
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', membership.team_id)
      .single()

    const inviterName = user.user_metadata?.full_name || user.email || 'A team member'

    const emailSent = await sendInviteResentEmail({
      email: invite.email,
      teamName: team?.name || 'Your Team',
      inviterName,
      role: invite.role,
      inviteId: invite.id
    })

    return NextResponse.json({
      success: true,
      message: emailSent ? 'Invitation resent successfully' : 'Invitation updated but email failed to send'
    })
  } catch (error) {
    console.error('Error in /api/team/invite/resend:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


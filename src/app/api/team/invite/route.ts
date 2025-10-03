import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { logTeamAction, AuditAction } from '@/lib/audit'
import { sendTeamInviteEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

/**
 * POST /api/team/invite
 * Create team invitations
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

    // Check if user can invite (owner or admin)
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to invite members' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { emails, role = 'member', message = '' } = body

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email list' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if emails are already team members
    const { data: existingMembers } = await supabase
      .from('team_members')
      .select('users!inner(email)')
      .eq('team_id', membership.team_id)

    const existingEmails = new Set(
      (existingMembers || []).map((m: any) => m.users?.email).filter(Boolean)
    )

    // Filter out existing members
    const newEmails = emails.filter(email => !existingEmails.has(email.toLowerCase()))

    if (newEmails.length === 0) {
      return NextResponse.json(
        { error: 'All emails are already team members', invites: [] },
        { status: 400 }
      )
    }

    // Create invite records
    const invitesToInsert = newEmails.map(email => ({
      team_id: membership.team_id,
      email: email.toLowerCase(),
      role,
      invited_by_user_id: user.id,
      message: message || null,
      status: 'pending'
    }))

    const { data: createdInvites, error: insertError } = await supabase
      .from('team_invites')
      .insert(invitesToInsert)
      .select()

    if (insertError) {
      console.error('Failed to create invites:', insertError)
      return NextResponse.json(
        { error: 'Failed to create invitations' },
        { status: 500 }
      )
    }

    // Log audit entries
    for (const invite of createdInvites || []) {
      await logTeamAction({
        teamId: membership.team_id,
        actorUserId: user.id,
        action: AuditAction.INVITE_SENT,
        targetEmail: invite.email,
        metadata: { role, message }
      })
    }

    // Transform for client
    const invites = (createdInvites || []).map((invite: any) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      invited_by: user.email || '',
      status: invite.status,
      created_at: invite.created_at,
      updated_at: invite.updated_at
    }))

    // Send invitation emails
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', membership.team_id)
      .single()

    const inviterName = user.user_metadata?.full_name || user.email || 'A team member'

    const emailResults = await Promise.allSettled(
      invites.map(invite =>
        sendTeamInviteEmail({
          email: invite.email,
          teamName: team?.name || 'Your Team',
          inviterName,
          role: invite.role,
          inviteId: invite.id,
          message
        })
      )
    )

    const emailsFailed = emailResults.filter(r => r.status === 'rejected').length

    return NextResponse.json({
      invites,
      message: `${invites.length} invitation${invites.length !== 1 ? 's' : ''} sent successfully${emailsFailed > 0 ? ` (${emailsFailed} email${emailsFailed !== 1 ? 's' : ''} failed to send)` : ''}`
    })
  } catch (error) {
    console.error('Error in /api/team/invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


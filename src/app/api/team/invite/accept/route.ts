import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { verifyInviteToken } from '@/lib/email'
import { logTeamAction, AuditAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/team/invite/accept
 * Accept a team invitation via token
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user (or create one if they don't exist)
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Verify the token
    const tokenData = verifyInviteToken(token)
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation token' },
        { status: 400 }
      )
    }

    // Get the invitation
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('*, teams(name)')
      .eq('id', tokenData.inviteId)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invitation not found or already accepted' },
        { status: 404 }
      )
    }

    // If user is not logged in, they need to sign up or sign in first
    if (!user) {
      // Store the token in a cookie for after auth
      return NextResponse.json(
        { 
          error: 'You must sign in or create an account to accept this invitation',
          redirectTo: `/auth/signup?invite=${token}`
        },
        { status: 401 }
      )
    }

    // Verify the email matches (case-insensitive)
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { 
          error: `This invitation is for ${invite.email}. Please sign in with that email address.` 
        },
        { status: 403 }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('team_id', invite.team_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      // Update the invite status
      await supabase
        .from('team_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id)

      return NextResponse.json({
        message: 'You are already a member of this team',
        teamName: invite.teams?.name || 'the team',
        alreadyMember: true
      })
    }

    // Add user to team
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: invite.team_id,
        user_id: user.id,
        role: invite.role
      })

    if (memberError) {
      console.error('Failed to add team member:', memberError)
      return NextResponse.json(
        { error: 'Failed to join team' },
        { status: 500 }
      )
    }

    // Update invite status
    const { error: updateError } = await supabase
      .from('team_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)

    if (updateError) {
      console.error('Failed to update invite status:', updateError)
    }

    // Log audit entry
    await logTeamAction({
      teamId: invite.team_id,
      actorUserId: user.id,
      action: AuditAction.INVITE_ACCEPTED,
      targetUserId: user.id,
      metadata: { 
        role: invite.role,
        inviteId: invite.id
      }
    })

    await logTeamAction({
      teamId: invite.team_id,
      actorUserId: user.id,
      action: AuditAction.MEMBER_JOINED,
      targetUserId: user.id,
      metadata: { 
        role: invite.role 
      }
    })

    return NextResponse.json({
      success: true,
      message: `You've successfully joined ${invite.teams?.name || 'the team'}!`,
      teamName: invite.teams?.name || 'the team',
      role: invite.role
    })
  } catch (error) {
    console.error('Error in /api/team/invite/accept:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


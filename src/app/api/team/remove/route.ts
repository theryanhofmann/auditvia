import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { logTeamAction, AuditAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/team/remove
 * Remove a member from the team
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

    // Check if user can remove members (owner or admin)
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to remove members' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Prevent removing yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'You cannot remove yourself from the team' },
        { status: 403 }
      )
    }

    // Get target member's role
    const { data: targetMember, error: targetError } = await supabase
      .from('team_members')
      .select('role, user_id')
      .eq('team_id', membership.team_id)
      .eq('user_id', userId)
      .single()

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Prevent removing the last owner
    if (targetMember.role === 'owner') {
      // Count total owners
      const { count: ownerCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', membership.team_id)
        .eq('role', 'owner')

      if (ownerCount === 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner. Promote another member to owner first.' },
          { status: 403 }
        )
      }
    }

    // Admins cannot remove owners
    if (membership.role === 'admin' && targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Only owners can remove other owners' },
        { status: 403 }
      )
    }

    // Delete the member
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', membership.team_id)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Failed to remove member:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      )
    }

    // Log audit entry
    await logTeamAction({
      teamId: membership.team_id,
      actorUserId: user.id,
      action: AuditAction.MEMBER_REMOVED,
      targetUserId: userId,
      metadata: { removedRole: targetMember.role }
    })

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    })
  } catch (error) {
    console.error('Error in /api/team/remove:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { logTeamAction, AuditAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/team/role
 * Change a team member's role
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

    // Check if user can change roles (owner or admin)
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to change member roles' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, newRole } = body

    if (!userId || !newRole) {
      return NextResponse.json(
        { error: 'userId and newRole are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['owner', 'admin', 'member', 'viewer'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Get target member's current role
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

    const oldRole = targetMember.role

    // Prevent demoting/removing the last owner
    if (oldRole === 'owner' && newRole !== 'owner') {
      // Count total owners
      const { count: ownerCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', membership.team_id)
        .eq('role', 'owner')

      if (ownerCount === 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last owner. Promote another member to owner first.' },
          { status: 403 }
        )
      }
    }

    // Admins cannot change owner roles
    if (membership.role === 'admin' && (oldRole === 'owner' || newRole === 'owner')) {
      return NextResponse.json(
        { error: 'Only owners can change owner roles' },
        { status: 403 }
      )
    }

    // Update the role
    const { error: updateError } = await supabase
      .from('team_members')
      .update({ role: newRole })
      .eq('team_id', membership.team_id)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Failed to update role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      )
    }

    // Log audit entry
    await logTeamAction({
      teamId: membership.team_id,
      actorUserId: user.id,
      action: AuditAction.ROLE_CHANGED,
      targetUserId: userId,
      metadata: { oldRole, newRole }
    })

    return NextResponse.json({
      success: true,
      message: `Role changed from ${oldRole} to ${newRole}`
    })
  } catch (error) {
    console.error('Error in /api/team/role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


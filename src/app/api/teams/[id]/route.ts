import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import { resolveTeamForRequest, getCookieTeamId, logTeamResolution } from '@/lib/team-resolution'
import type { Database } from '@/app/types/database'

// Force Node.js runtime for NextAuth session support
export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/teams/[id] - Get details for a specific team
 * 
 * Logs debug info: userId, requested teamId, cookie teamId, resolved teamId, allow/deny
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: requestedTeamId } = await params
    if (!requestedTeamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    // Resolve team using centralized logic
    const resolution = await resolveTeamForRequest(requestedTeamId, true)
    const cookieTeamId = await getCookieTeamId()

    if (!resolution) {
      // Log denial
      logTeamResolution('GET /api/teams/[id]', {
        userId: session.user.id,
        requestedTeamId,
        cookieTeamId,
        resolvedTeamId: 'none',
        source: 'none',
        allowed: false,
        denyReason: 'Resolution failed or user not member'
      })

      return NextResponse.json(
        { 
          error: 'not_team_member', 
          teamId: requestedTeamId,
          userId: session.user.id
        },
        { status: 403 }
      )
    }

    // Check for team ID mismatch (requested != resolved)
    if (requestedTeamId !== resolution.teamId) {
      logTeamResolution('GET /api/teams/[id]', {
        userId: resolution.userId,
        requestedTeamId,
        cookieTeamId,
        resolvedTeamId: resolution.teamId,
        source: resolution.source,
        allowed: false,
        denyReason: 'Team ID mismatch'
      })

      return NextResponse.json(
        { 
          error: 'team_id_mismatch',
          requestedTeamId,
          resolvedTeamId: resolution.teamId,
          cookieTeamId
        },
        { status: 409 }
      )
    }

    // Log successful access
    logTeamResolution('GET /api/teams/[id]', {
      userId: resolution.userId,
      requestedTeamId,
      cookieTeamId,
      resolvedTeamId: resolution.teamId,
      source: resolution.source,
      allowed: true
    })

    // Get team details using service role (bypass RLS since we've validated membership)
    const supabase = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', resolution.teamId)
      .single()

    if (teamError || !team) {
      console.error('[team-access] Team query failed:', {
        teamId: resolution.teamId,
        error: teamError?.message,
        code: teamError?.code
      })
      
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...team,
      userRole: resolution.role
    })

  } catch (error) {
    console.error('Error in GET /api/teams/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: teamId } = await params
    const supabase = await createClient()

    // Check if user is team owner
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', session.user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    if (member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only team owners can delete teams' },
        { status: 403 }
      )
    }

    // Delete team (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (deleteError) {
      console.error('Error deleting team:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete team' },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
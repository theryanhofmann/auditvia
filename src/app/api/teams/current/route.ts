import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTeamInfo } from '@/app/lib/resolveCurrentUserAndTeam'
import { resolveTeamForRequest } from '@/lib/team-resolution'
import { auth } from '@/auth'
import { cookies } from 'next/headers'

// Force Node.js runtime for NextAuth session support
export const runtime = 'nodejs'

const TEAM_COOKIE_NAME = 'teamId'

/**
 * GET /api/teams/current - Get the current team for the authenticated user
 * Always returns 200 with team info for authenticated users (creates team if needed)
 * Returns 401 only for authentication failures
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Check authentication first
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Structured logging (dev only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🏛️ [teams/current] Auth check passed:', {
        appUserId: session.user.id,
        email: session.user.email
      })
    }

    // Use resolver to get or create team
    const result = await getCurrentTeamInfo()
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to resolve or create team for user' }, 
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      teamId: result.teamId,
      teamName: result.teamName
    })
  } catch (error) {
    console.error('Error in GET /api/teams/current:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teams/current - Set the current team for the authenticated user
 * Uses centralized team resolution to validate membership
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { teamId } = await request.json()

    if (!teamId || typeof teamId !== 'string') {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      )
    }

    // Use centralized resolution to check if user is member of requested team
    // IMPORTANT: Pass the requested teamId to validate membership
    console.log('[teams/current POST] Validating teamId:', teamId)
    
    const resolution = await resolveTeamForRequest(teamId, true)
    
    console.log('[teams/current POST] Resolution result:', {
      requested: teamId,
      resolved: resolution?.teamId,
      source: resolution?.source,
      userId: resolution?.userId
    })
    
    if (!resolution) {
      console.log('[teams/current POST] Resolution failed - no team found')
      return NextResponse.json(
        { error: 'You are not a member of this team' },
        { status: 403 }
      )
    }

    // Check if resolution actually resolved to the requested team
    // If it resolved to a different team, user is not a member of requested team
    if (resolution.teamId !== teamId) {
      console.log('[teams/current POST] Team mismatch - user not member:', {
        requested: teamId,
        resolved: resolution.teamId,
        source: resolution.source
      })
      
      return NextResponse.json(
        { 
          error: 'You are not a member of this team',
          details: `You are not a member of team ${teamId}`
        },
        { status: 403 }
      )
    }
    
    console.log('[teams/current POST] Validation successful - user IS member')

    // User is a member! Set the cookie
    const cookieStore = await cookies()
    cookieStore.set(TEAM_COOKIE_NAME, teamId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/'
    })

    return NextResponse.json({ success: true, teamId })
  } catch (error) {
    console.error('Error in POST /api/teams/current:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

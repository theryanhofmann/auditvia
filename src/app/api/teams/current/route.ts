import { NextRequest, NextResponse } from 'next/server'
import { resolveCurrentUserAndTeam, getCurrentTeamInfo } from '@/app/lib/resolveCurrentUserAndTeam'
import { setCurrentTeamId, validateTeamMembership } from '@/app/lib/team-utils'
import { auth } from '@/auth'

// Force Node.js runtime for NextAuth session support
export const runtime = 'nodejs'

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
        appUserId: session.user.id, // This should be app UUID now
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

    // Validate user is a member of this team
    const isValid = await validateTeamMembership(teamId)
    if (!isValid) {
      return NextResponse.json(
        { error: 'You are not a member of this team' },
        { status: 403 }
      )
    }

    // Set the current team
    await setCurrentTeamId(teamId)

    return NextResponse.json({ success: true, teamId })
  } catch (error) {
    console.error('Error in POST /api/teams/current:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

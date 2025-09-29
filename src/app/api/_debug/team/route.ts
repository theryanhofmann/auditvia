import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { auth } from '@/auth'
import { createClient } from '@/app/lib/supabase/server'
import { resolveCurrentUserAndTeam } from '@/app/lib/resolveCurrentUserAndTeam'

// Force Node.js runtime for NextAuth session support
export const runtime = 'nodejs'

const TEAM_COOKIE_NAME = 'teamId'

/**
 * Debug route for troubleshooting team resolution
 * Only available in development
 */
export async function GET(): Promise<NextResponse> {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    const session = await auth()
    const cookieStore = await cookies()
    const cookieTeamId = cookieStore.get(TEAM_COOKIE_NAME)?.value

    if (!session?.user?.id) {
      return NextResponse.json({
        sessionUserId: null,
        cookieTeamId: cookieTeamId || null,
        memberships: [],
        resolvedTeamId: null,
        error: 'Not authenticated'
      })
    }

    const supabase = await createClient()
    
    // Get user's database ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('github_id', session.user.id)
      .single()

    let memberships: string[] = []
    if (user) {
      const { data: membershipData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true })

      memberships = membershipData?.map(m => m.team_id) || []
    }

    // Get resolved team using the new resolver
    const resolverResult = await resolveCurrentUserAndTeam()

    return NextResponse.json({
      sessionUserId: session.user.id,
      dbUserId: user?.id || null,
      cookieTeamId: cookieTeamId || null,
      memberships,
      resolverResult: resolverResult,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in debug team route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

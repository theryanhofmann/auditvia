import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { auth } from '@/auth'

/**
 * Debug endpoint to check team membership
 * Only available in development
 */
export async function GET(_request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all team memberships for this user (only guaranteed columns)
    const { data: memberships, error } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        team_id,
        role,
        created_at,
        team:teams(
          id,
          name
        )
      `)
      .eq('user_id', session.user.id)

    return NextResponse.json({
      success: true,
      sessionUserId: session.user.id,
      sessionEmail: session.user.email,
      memberships: memberships || [],
      error: error?.message || null,
      count: memberships?.length || 0
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

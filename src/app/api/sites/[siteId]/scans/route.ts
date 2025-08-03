import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import type { Database } from '@/app/types/database'

type TypedSupabaseClient = Database['public']['Tables']['scans']['Row']

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    // Get the limit and teamId from query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '5')
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First get the user's Supabase ID from their GitHub ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('github_id', session.user.id)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 })
    }

    if (!user) {
      console.error('User not found for GitHub ID:', session.user.id)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify team membership
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: 'You do not have access to this team' },
        { status: 403 }
      )
    }

    // Verify site belongs to team
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id')
      .eq('id', params.siteId)
      .eq('team_id', teamId)
      .single()

    if (siteError || !site) {
      console.error('Site not found or access denied:', siteError)
      return NextResponse.json({ error: 'Site not found or access denied' }, { status: 404 })
    }

    // Fetch scans for the site
    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select('id, created_at, total_violations, status, team_id')
      .eq('site_id', params.siteId)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (scansError) {
      console.error('Error fetching scans:', scansError)
      return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 })
    }

    return NextResponse.json({ scans: scans || [] })
  } catch (error) {
    console.error('Error in GET /api/sites/[siteId]/scans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
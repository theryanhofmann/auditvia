import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import type { Database } from '@/app/types/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's Supabase ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('github_id', session.user.id)
      .single()

    if (userError || !user) {
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

    // Fetch sites for the team with latest scans
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select(`
        *,
        scans (
          id,
          created_at,
          score,
          total_violations
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .order('created_at', { ascending: false, foreignTable: 'scans' })

    if (sitesError) {
      return NextResponse.json({ error: sitesError.message }, { status: 500 })
    }

    return NextResponse.json({ sites: sites || [] })
  } catch (error) {
    console.error('Error in GET /api/sites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url, name, teamId } = body

    if (!url || !teamId) {
      return NextResponse.json(
        { error: 'URL and team ID are required' },
        { status: 400 }
      )
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user's Supabase ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('github_id', session.user.id)
      .single()

    if (userError || !user) {
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

    // Create site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert([
        {
          url,
          name: name || null,
          user_id: user.id,
          team_id: teamId,
          monitoring_enabled: false
        }
      ])
      .select()
      .single()

    if (siteError) {
      return NextResponse.json({ error: siteError.message }, { status: 500 })
    }

    return NextResponse.json({ site })
  } catch (error) {
    console.error('Error in POST /api/sites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
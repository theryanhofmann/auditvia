import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import type { Database } from '@/app/types/database'
import { getCurrentTeamInfo } from '@/app/lib/resolveCurrentUserAndTeam'

// Force Node.js runtime for NextAuth session support
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    const session = await auth()
    console.log('🔍 [sites-get] Session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    })

    if (!session?.user?.id) {
      console.error('🔍 [sites-get] No session or user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // session.user.id is now the app UUID (normalized in NextAuth callbacks)
    const appUserId = session.user.id
    console.log('🔍 [sites-get] Checking membership:', {
      appUserId,
      teamId,
      userEmail: session.user.email
    })

    // Verify team membership
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', appUserId)
      .single()

    console.log('🔍 [sites-get] Membership check result:', {
      found: !!teamMember,
      role: teamMember?.role,
      error: teamError?.message
    })

    if (teamError || !teamMember) {
      console.error('🔍 [sites-get] Team membership check failed:', teamError?.message, 'userId:', appUserId, 'teamId:', teamId)
      
      // Check if user exists at all
      const { data: userCheck } = await supabase
        .from('users')
        .select('id, github_id')
        .eq('id', appUserId)
        .single()
      
      console.error('🔍 [sites-get] User exists check:', userCheck)
      
      return NextResponse.json(
        { error: 'You do not have access to this team' },
        { status: 403 }
      )
    }

    // Fetch sites for the team with latest scans
    console.log('🔍 [sites-get] Fetching sites for team:', teamId)
    
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select(`
        *,
        scans (
          id,
          created_at,
          total_violations,
          status
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .order('created_at', { ascending: false, foreignTable: 'scans' })

    console.log('🔍 [sites-get] Sites query result:', {
      sitesCount: sites?.length || 0,
      error: sitesError?.message
    })

    if (sitesError) {
      console.error('🔍 [sites-get] Sites query failed:', sitesError)
      return NextResponse.json({ error: sitesError.message }, { status: 500 })
    }

    console.log('🔍 [sites-get] Returning sites successfully')
    return NextResponse.json({ sites: sites || [] })
  } catch (error) {
    console.error('🔍 [sites-get] Unexpected error:', error)
    console.error('🔍 [sites-get] Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication first
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      console.error('🔍 [sites-post] Authentication failed - no session or missing user data')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Structured logging (dev only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🏗️ [sites-post] Auth check passed:', {
        appUserId: session.user.id,
        email: session.user.email
      })
    }

    // Parse and validate request body
    const body = await request.json()
    const { url, name, custom_domain } = body

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    let normalizedUrl: string
    try {
      const urlObj = new URL(url)
      normalizedUrl = urlObj.toString()
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Resolve current team (idempotent - creates user/team if needed)
    console.log('🏗️ [sites] Resolving team for user:', session.user.email, 'userId:', session.user.id)
    
    let teamInfo
    try {
      console.log('🏗️ [sites] About to call getCurrentTeamInfo for user:', {
        sessionUserId: session.user.id,
        email: session.user.email
      })
      
      teamInfo = await getCurrentTeamInfo()
      console.log('🏗️ [sites] Team resolution result:', teamInfo)
    } catch (teamError) {
      console.error('🏗️ [sites] Team resolution threw error:', teamError)
      console.error('🏗️ [sites] Error stack:', teamError instanceof Error ? teamError.stack : 'No stack')
      
      return NextResponse.json(
        { 
          error: 'Failed to resolve user team. Please try again.',
          details: process.env.NODE_ENV === 'development' ? (teamError instanceof Error ? teamError.message : String(teamError)) : undefined
        },
        { status: 500 }
      )
    }

    if (!teamInfo) {
      console.error('🏗️ [sites] getCurrentTeamInfo returned null for user:', session.user.email)
      return NextResponse.json(
        { 
          error: 'Failed to resolve user team. Please try again.',
          details: process.env.NODE_ENV === 'development' ? 'getCurrentTeamInfo returned null' : undefined
        },
        { status: 500 }
      )
    }

    const { teamId } = teamInfo
    console.log('🏗️ [sites-api] Team resolved:', { teamId, userEmail: session.user.email })

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user ID (session.user.id is now the app UUID)
    const appUserId = session.user.id // This is now the app UUID from NextAuth normalization
    
    // Verify user exists (should always exist after resolver)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, github_id')
      .eq('id', appUserId) // Look up by app UUID
      .single()

    if (userError || !user) {
      console.error('🏗️ [sites] User not found by app UUID:', appUserId, 'error:', userError?.message)
      return NextResponse.json(
        { error: 'User not found. Please try again.' },
        { status: 500 }
      )
    }

    // Structured logging (dev only)
    if (process.env.NODE_ENV === 'development') {
      console.log('🏗️ [sites] User verified:', {
        appUserId: user.id,
        githubId: user.github_id,
        teamIdAttempted: teamInfo.teamId
      })
    }

    // Check if site already exists for this team
    const { data: existingSites } = await supabase
      .from('sites')
      .select('id')
      .eq('team_id', teamId)
      .eq('url', normalizedUrl)

    if (existingSites && existingSites.length > 0) {
      return NextResponse.json(
        { error: 'Site already exists' },
        { status: 400 }
      )
    }

    // Create site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert([
        {
          url: normalizedUrl,
          name: name || null,
          user_id: user.id,
          team_id: teamId,
          monitoring_enabled: false,
          custom_domain: custom_domain || null
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
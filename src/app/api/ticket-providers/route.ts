/**
 * Ticket Providers API
 * Manage GitHub/Jira integrations for a team
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { auth } from '@/auth'

/**
 * GET /api/ticket-providers
 * Fetch team's ticket providers
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get team ID from query param or use current team
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')

    if (!teamId) {
      return NextResponse.json({ error: 'team_id query parameter is required' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify user is a member of the team
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch providers (RLS will filter automatically, but we use service role)
    const { data: providers, error } = await supabase
      .from('ticket_providers')
      .select('id, team_id, provider_type, config, is_active, created_at, updated_at, last_used_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch providers:', error)
      return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
    }

    return NextResponse.json({ providers: providers || [] })
  } catch (error: any) {
    console.error('Exception fetching providers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/ticket-providers
 * Create or update a ticket provider
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()

    const { team_id, provider_type, config, encrypted_token } = body

    if (!team_id || !provider_type || !config || !encrypted_token) {
      return NextResponse.json(
        { error: 'team_id, provider_type, config, and encrypted_token are required' },
        { status: 400 }
      )
    }

    if (!['github', 'jira'].includes(provider_type)) {
      return NextResponse.json({ error: 'provider_type must be github or jira' }, { status: 400 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify user is owner/admin of the team
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', userId)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only team owners and admins can manage ticket providers' },
        { status: 403 }
      )
    }

    // Upsert provider (one per team per provider type)
    const { data: provider, error } = await supabase
      .from('ticket_providers')
      .upsert(
        {
          team_id,
          provider_type,
          config,
          encrypted_token, // In production, encrypt before storing
          is_active: true,
          created_by: userId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'team_id,provider_type',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Failed to create/update provider:', error)
      return NextResponse.json({ error: 'Failed to save provider' }, { status: 500 })
    }

    return NextResponse.json({ provider }, { status: 201 })
  } catch (error: any) {
    console.error('Exception creating provider:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

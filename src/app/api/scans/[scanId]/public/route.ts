import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import type { Database } from '@/app/types/database'

export async function PUT(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { public: isPublic, teamId } = body

    if (typeof isPublic !== 'boolean' || !teamId) {
      return NextResponse.json(
        { error: 'Invalid request body' },
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
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      )
    }

    // Verify team membership and role
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

    // Only admins and owners can toggle scan visibility
    if (!['admin', 'owner'].includes(teamMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Verify scan belongs to team
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('id')
      .eq('id', params.scanId)
      .eq('team_id', teamId)
      .single()

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan not found or you do not have access' },
        { status: 404 }
      )
    }

    // Update scan visibility
    const { error: updateError } = await supabase
      .from('scans')
      .update({ public: isPublic })
      .eq('id', params.scanId)
      .eq('team_id', teamId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update scan visibility' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/scans/[scanId]/public:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
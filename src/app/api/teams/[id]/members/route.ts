import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'
import crypto from 'crypto'

interface RouteParams {
  params: {
    id: string
  }
}

async function isTeamAdmin(supabase: any, teamId: string, userId: string) {
  const { data } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()

  return data?.role === 'owner' || data?.role === 'admin'
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabase = await createClient()

    // Check if user has permission to view members
    if (!(await isTeamAdmin(supabase, params.id, session.user.id))) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Get team members with user details
    const { data: members, error } = await supabase
      .from('team_members')
      .select(`
        id,
        role,
        joined_at,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .eq('team_id', params.id)

    if (error) {
      console.error('Error fetching team members:', error)
      return new NextResponse('Failed to fetch team members', { status: 500 })
    }

    return NextResponse.json(members)
  } catch (error) {
    console.error('Error in GET /api/teams/[id]/members:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabase = await createClient()

    // Check if user has permission to invite members
    if (!(await isTeamAdmin(supabase, params.id, session.user.id))) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { email, role } = await request.json()

    // Validate input
    if (!email || typeof email !== 'string' || !role || !['admin', 'member'].includes(role)) {
      return new NextResponse('Invalid request body', { status: 400 })
    }

    // Check if invite already exists
    const { data: existingInvite } = await supabase
      .from('team_invites')
      .select()
      .eq('team_id', params.id)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return new NextResponse('Invite already sent', { status: 409 })
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')

    // Create invite
    const { data: invite, error } = await supabase
      .from('team_invites')
      .insert({
        team_id: params.id,
        email: email.toLowerCase(),
        role,
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invite:', error)
      return new NextResponse('Failed to create invite', { status: 500 })
    }

    // TODO: Send invite email
    console.log('TODO: Send invite email to', email, 'with token', token)

    return NextResponse.json(invite)
  } catch (error) {
    console.error('Error in POST /api/teams/[id]/members:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
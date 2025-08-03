import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { token } = await request.json()
    if (!token || typeof token !== 'string') {
      return new NextResponse('Invalid token', { status: 400 })
    }

    const supabase = await createClient()

    // Get and validate invite
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select()
      .eq('team_id', params.id)
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invite) {
      return new NextResponse('Invalid or expired invite', { status: 404 })
    }

    // Check if invite is expired
    if (new Date(invite.expires_at) < new Date()) {
      return new NextResponse('Invite has expired', { status: 410 })
    }

    // Check if user's email matches invite
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', session.user.id)
      .single()

    if (!user || user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return new NextResponse('Email mismatch', { status: 403 })
    }

    // Begin transaction
    const { error: transactionError } = await supabase.rpc('accept_team_invite', {
      p_team_id: params.id,
      p_user_id: session.user.id,
      p_token: token,
      p_role: invite.role
    })

    if (transactionError) {
      console.error('Error accepting invite:', transactionError)
      return new NextResponse('Failed to accept invite', { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in POST /api/teams/[id]/invite/accept:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
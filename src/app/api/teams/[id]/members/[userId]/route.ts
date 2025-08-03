import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'

interface RouteParams {
  params: {
    id: string
    userId: string
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabase = await createClient()

    // Get current user's role
    const { data: currentMember, error: currentError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (currentError || !currentMember) {
      return new NextResponse('Team not found', { status: 404 })
    }

    // Get target member's role
    const { data: targetMember, error: targetError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', params.id)
      .eq('user_id', params.userId)
      .single()

    if (targetError || !targetMember) {
      return new NextResponse('Member not found', { status: 404 })
    }

    // Check permissions
    if (currentMember.role === 'member') {
      return new NextResponse('Insufficient permissions', { status: 403 })
    }

    if (currentMember.role === 'admin' && targetMember.role === 'owner') {
      return new NextResponse('Cannot remove owner', { status: 403 })
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', params.id)
      .eq('user_id', params.userId)

    if (deleteError) {
      console.error('Error removing member:', deleteError)
      return new NextResponse('Failed to remove member', { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]/members/[userId]:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
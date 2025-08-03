import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'

interface RouteParams {
  params: {
    id: string
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabase = await createClient()

    // Check if user is team owner
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', params.id)
      .eq('user_id', session.user.id)
      .single()

    if (memberError || !member) {
      return new NextResponse('Team not found', { status: 404 })
    }

    if (member.role !== 'owner') {
      return new NextResponse('Only team owners can delete teams', { status: 403 })
    }

    // Delete team (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting team:', deleteError)
      return new NextResponse('Failed to delete team', { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createClient } from '@/app/lib/supabase/server'
import type { Database } from '@/app/types/database'

// Force Node.js runtime for NextAuth session support
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { name } = await request.json()
    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 50) {
      return new NextResponse('Invalid team name', { status: 400 })
    }

    const supabase = await createClient()
    
    // Create team and add creator as owner in a transaction
    const { data: team, error } = await supabase
      .from('teams')
      .insert({
        name,
        created_by: session.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating team:', error)
      return new NextResponse('Failed to create team', { status: 500 })
    }

    return NextResponse.json(team)
  } catch (error) {
    console.error('Error in POST /api/teams:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabase = await createClient()

    // Get all teams the user is a member of
    const { data: teams, error } = await supabase
      .from('team_members')
      .select(`
        id,
        role,
        team:teams (
          id,
          name,
          created_at
        )
      `)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error fetching teams:', error)
      return new NextResponse('Failed to fetch teams', { status: 500 })
    }

    return NextResponse.json(teams)
  } catch (error) {
    console.error('Error in GET /api/teams:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 
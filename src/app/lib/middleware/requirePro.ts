import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function requirePro(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      )
    }

    // Get team ID from request
    const teamId = request.nextUrl.searchParams.get('teamId')
    if (!teamId) {
      return new NextResponse(
        JSON.stringify({ error: 'Team ID is required' }),
        { status: 400 }
      )
    }

    // Check team pro access
    const supabase = await createClient()
    const { data: hasPro } = await supabase
      .rpc('has_team_pro_access', { team_id: teamId })
      .single()

    if (!hasPro) {
      return new NextResponse(
        JSON.stringify({
          error: 'This feature requires a Pro subscription',
          code: 'PRO_REQUIRED',
          teamId
        }),
        { 
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    return null // Continue to the handler
  } catch (error) {
    console.error('Error in requirePro middleware:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    )
  }
} 
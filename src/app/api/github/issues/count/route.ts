import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/app/types/database'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Count GitHub issues for this team
    const { count, error } = await supabase
      .from('github_issues')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)

    if (error) {
      console.error('Failed to count GitHub issues:', error)
      return NextResponse.json(
        { count: 0 }, // Graceful fallback
        { status: 200 }
      )
    }

    return NextResponse.json(
      { count: count || 0 },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in /api/github/issues/count:', error)
    return NextResponse.json(
      { count: 0 }, // Graceful fallback
      { status: 200 }
    )
  }
}

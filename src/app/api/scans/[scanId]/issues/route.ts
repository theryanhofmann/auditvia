import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/app/types/database'
import { cookies } from 'next/headers'

export async function GET(request: Request, { params }: { params: { scanId: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set(name, '', options)
            } catch {
              // The `remove` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          }
        }
      }
    )

    // First verify the user has access to this team
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .single()

    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: 'You do not have access to this team' },
        { status: 403 }
      )
    }

    // Then verify the scan belongs to this team
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('id, team_id')
      .eq('id', params.scanId)
      .eq('team_id', teamId)
      .single()

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan not found or you do not have access' },
        { status: 404 }
      )
    }

    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('*')
      .eq('scan_id', params.scanId)

    if (issuesError) {
      return NextResponse.json({ error: issuesError.message }, { status: 500 })
    }

    return NextResponse.json({ issues })
  } catch (error) {
    console.error('Error in GET /api/scans/[scanId]/issues:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
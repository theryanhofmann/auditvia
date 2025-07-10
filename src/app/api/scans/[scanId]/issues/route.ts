import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/app/types/database'
import { cookies } from 'next/headers'

export async function GET(request: Request, { params }: { params: { scanId: string } }) {
  try {
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

    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('id')
      .eq('id', params.scanId)
      .single()

    if (scanError) {
      return NextResponse.json({ error: scanError.message }, { status: 500 })
    }

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('*')
      .eq('scan_id', params.scanId)

    if (issuesError) {
      return NextResponse.json({ error: issuesError.message }, { status: 500 })
    }

    return NextResponse.json(issues)
  } catch (error) {
    console.error('Error in GET /api/scans/[scanId]/issues:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
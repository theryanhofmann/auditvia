import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { Database } from '@/app/types/database'
import { cookies } from 'next/headers'

type IssueCounts = {
  critical: number
  serious: number
  moderate: number
  minor: number
  total: number
}

type Issue = {
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
}

export async function GET() {
  console.log('📧 Starting daily summary email job')
  
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

    // Get all sites with monitoring enabled
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, url, user_id')
      .eq('monitoring_enabled', true)

    if (sitesError) {
      console.error('Failed to fetch sites:', sitesError)
      throw new Error('Failed to fetch sites')
    }

    // Get yesterday's scans for each site
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const site of sites) {
      console.log(`Processing site: ${site.url}`)
      
      const { data: scans, error: scansError } = await supabase
        .from('scans')
        .select('id, score')
        .eq('site_id', site.id)
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())

      if (scansError) {
        console.error(`Failed to fetch scans for site ${site.url}:`, scansError)
        continue
      }

      if (!scans?.length) {
        console.log(`No scans found for site ${site.url}`)
        continue
      }

      // Get issues for each scan
      let issuesCounts: IssueCounts = { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 }
      
      for (const scan of scans) {
        const { data: issues, error: issuesError } = await supabase
          .from('issues')
          .select('severity')
          .eq('scan_id', scan.id)

        if (issuesError) {
          console.error(`Failed to fetch issues for scan ${scan.id}:`, issuesError)
          continue
        }

        // Count issues by severity
        issuesCounts = (issues || []).reduce((acc: IssueCounts, issue: Issue) => {
          const severity = issue.severity
          acc[severity] = (acc[severity] || 0) + 1
          acc.total += 1
          return acc
        }, { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 })
      }

      // TODO: Send email with summary
      console.log(`Summary for ${site.url}:`, issuesCounts)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in daily summary job:', error)
    return NextResponse.json(
      { error: 'Failed to process daily summary' },
      { status: 500 }
    )
  }
} 
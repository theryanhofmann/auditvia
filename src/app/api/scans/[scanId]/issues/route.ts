import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{
    scanId: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { scanId } = await context.params

    // Get authenticated user
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch scan with site info to verify ownership
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select(`
        id,
        site_id,
        status,
        total_violations,
        sites!inner (
          team_id,
          name,
          url
        )
      `)
      .eq('id', scanId)
      .single()

    if (scanError || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    // If scan is not completed, return early with pending status
    if (scan.status !== 'completed') {
      return NextResponse.json({ 
        success: false, 
        pending: true,
        status: scan.status,
        message: 'Scan not yet completed'
      }, { status: 202 }) // 202 Accepted = processing
    }

    // Verify user has access to the team
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('team_id', (scan.sites as any).team_id)
      .eq('user_id', session.user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch issues for this scan
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('*')
      .eq('scan_id', scanId)
      .order('severity', { ascending: false })

    if (issuesError) {
      console.error('Error fetching issues:', issuesError)
      return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      scanId: scan.id,
      siteId: scan.site_id,
      siteName: (scan.sites as any).name,
      siteUrl: (scan.sites as any).url,
      status: scan.status,
      totalIssues: scan.total_violations || 0,
      issues: issues || []
    })
  } catch (error) {
    console.error('Error in GET /api/scans/[scanId]/issues:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

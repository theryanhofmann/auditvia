import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  createReportsClient,
  verifyTeamAccess,
  parseReportFilters,
  ErrorResponses
} from '@/lib/reports-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/reports/kpis
 * Returns high-level KPI summary for dashboard cards
 * 
 * Query params:
 * - teamId (required): Team ID to fetch KPIs for
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(ErrorResponses.unauthorized, { status: 401 })
    }

    // 2. Parse filters
    const { filters, error: parseError } = parseReportFilters(request.nextUrl.searchParams)
    if (!filters || parseError) {
      return NextResponse.json(parseError, { status: 400 })
    }

    // 3. Verify team access
    const supabase = createReportsClient()
    const { allowed, error: accessError } = await verifyTeamAccess(
      supabase,
      session.user.id,
      filters.teamId
    )

    if (!allowed || accessError) {
      return NextResponse.json(accessError, { status: 403 })
    }

    // 4. Query KPIs view
    const { data, error } = await supabase
      .from('report_kpis_view')
      .select('*')
      .eq('team_id', filters.teamId)
      .single()

    if (error) {
      console.error('[kpis] Database error:', error)
      return NextResponse.json(
        {
          error: 'Failed to fetch KPIs',
          code: 'DATABASE_ERROR',
          details: error.message
        },
        { status: 500 }
      )
    }

    // 5. Return formatted data
    return NextResponse.json({
      success: true,
      data: data || {
        total_scans_30d: 0,
        total_sites: 0,
        monitored_sites: 0,
        total_violations_30d: 0,
        avg_score_30d: 0,
        github_issues_created_30d: 0
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[kpis] Unexpected error:', error)
    return NextResponse.json(ErrorResponses.internalError, { status: 500 })
  }
}

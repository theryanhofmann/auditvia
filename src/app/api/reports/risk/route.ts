import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createReportsClient, verifyTeamAccess, parseReportFilters, ErrorResponses } from '@/lib/reports-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(ErrorResponses.unauthorized, { status: 401 })
    }

    const { filters, error: parseError } = parseReportFilters(request.nextUrl.searchParams)
    if (!filters || parseError) {
      return NextResponse.json(parseError, { status: 400 })
    }

    const supabase = createReportsClient()
    const { allowed, error: accessError } = await verifyTeamAccess(supabase, session.user.id, filters.teamId)
    if (!allowed || accessError) {
      return NextResponse.json(accessError, { status: 403 })
    }

    let query = supabase.from('risk_reduced_view').select('*').eq('team_id', filters.teamId)
    if (filters.siteId) query = query.eq('site_id', filters.siteId)
    if (filters.startDate) query = query.gte('date', filters.startDate)
    if (filters.endDate) query = query.lte('date', filters.endDate)
    query = query.order('date', { ascending: false }).limit(90)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch risk data', code: 'DATABASE_ERROR', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [], timestamp: new Date().toISOString() })
  } catch (error: any) {
    console.error('[risk] Error:', error)
    return NextResponse.json(ErrorResponses.internalError, { status: 500 })
  }
}

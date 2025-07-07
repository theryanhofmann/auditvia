import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, createAdminDisabledResponse } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get Supabase client (admin or regular based on DEV_NO_ADMIN flag)
    const supabase = await getSupabaseClient()
    if (!supabase) {
      return createAdminDisabledResponse()
    }

    let query = supabase
      .from('scans')
      .select(`
        id,
        site_id,
        score,
        status,
        created_at,
        finished_at,
        sites!inner (
          id,
          url,
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: scans, error } = await query

    if (error) {
      console.error('Error fetching audit results:', error)
      return NextResponse.json({ error: 'Failed to fetch audit results' }, { status: 500 })
    }

    return NextResponse.json({ scans: scans || [] })
  } catch (error) {
    console.error('Error in GET /api/audit-results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { scanId } = await request.json()

    if (!scanId) {
      return NextResponse.json({ error: 'scanId is required' }, { status: 400 })
    }

    // Get Supabase client (admin or regular based on DEV_NO_ADMIN flag)
    const supabase = await getSupabaseClient()
    if (!supabase) {
      return createAdminDisabledResponse()
    }

    // Fetch scan details with associated issues
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select(`
        id,
        site_id,
        score,
        status,
        created_at,
        finished_at,
        sites!inner (
          id,
          url,
          name
        ),
        issues (
          id,
          rule,
          selector,
          severity,
          impact,
          description,
          help_url,
          html
        )
      `)
      .eq('id', scanId)
      .single()

    if (scanError) {
      console.error('Error fetching scan:', scanError)
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    // Return scan data with issues (no need to insert, data already exists)

    return NextResponse.json({ 
      success: true,
      scan: {
        ...scan,
        total_violations: scan.issues?.length || 0
      }
    })
  } catch (error) {
    console.error('Error in POST /api/audit-results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { getSupabaseClient, createAdminDisabledResponse } from '@/app/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/app/types/database'

type ScanWithDetails = Database['public']['Tables']['scans']['Row'] & {
  sites: {
    id: string
    url: string
    name: string | null
    user_id: string
  }
  issues: Array<{
    id: number
    rule: string
    selector: string
    severity: string
    impact: string | null
    description: string | null
    help_url: string | null
    html: string | null
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50')

    // DEV_NO_ADMIN bypass for testing
    if (process.env.DEV_NO_ADMIN === 'true') {
      // Return mock scan data
      const mockScans = [{
        id: `scan-${Date.now()}`,
        site_id: siteId || `site-${Date.now()}`,
        status: 'completed',
        created_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        sites: {
          id: siteId || `site-${Date.now()}`,
          url: 'https://example.com',
          name: 'example.com'
        }
      }]

      return NextResponse.json({ scans: mockScans })
    }

    // Check authentication for regular API calls
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Supabase client (admin or regular based on DEV_NO_ADMIN flag)
    const supabase = await getSupabaseClient() as SupabaseClient<Database>
    if (!supabase) {
      return createAdminDisabledResponse()
    }

    let query = supabase
      .from('scans')
      .select(`
        id,
        site_id,
        status,
        created_at,
        finished_at,
        total_violations,
        passes,
        incomplete,
        inapplicable,
        scan_time_ms,
        sites!inner (
          id,
          url,
          name,
          user_id
        )
      `)
      .eq('sites.user_id', session.user.id)
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

    // Check authentication for regular API calls
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Supabase client (admin or regular based on DEV_NO_ADMIN flag)
    const supabase = await getSupabaseClient() as SupabaseClient<Database>
    if (!supabase) {
      return createAdminDisabledResponse()
    }

    // Fetch scan details with associated issues
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select(`
        id,
        site_id,
        status,
        created_at,
        finished_at,
        total_violations,
        passes,
        incomplete,
        inapplicable,
        scan_time_ms,
        sites!inner (
          id,
          url,
          name,
          user_id
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
      .eq('sites.user_id', session.user.id)
      .single()

    if (scanError) {
      console.error('Error fetching scan:', scanError)
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    if (!scan) {
      console.error('No scan found')
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const typedScan = scan as ScanWithDetails

    return NextResponse.json({ 
      success: true,
      scan: {
        ...typedScan,
        total_violations: typedScan.issues?.length || 0
      }
    })
  } catch (error) {
    console.error('Error in POST /api/audit-results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
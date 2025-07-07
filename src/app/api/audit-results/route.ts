import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, createAdminDisabledResponse } from '@/app/lib/supabase/server'

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
        score: 85,
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

    // DEV_NO_ADMIN bypass for testing
    if (process.env.DEV_NO_ADMIN === 'true') {
      // Return mock scan with issues
      const mockScan = {
        id: scanId,
        site_id: `site-${Date.now()}`,
        score: 85,
        status: 'completed',
        created_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        sites: {
          id: `site-${Date.now()}`,
          url: 'https://example.com',
          name: 'example.com'
        },
        issues: [
          {
            id: 'issue-1',
            rule: 'color-contrast',
            selector: 'button.btn-primary',
            severity: 'serious',
            impact: 'serious',
            description: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds',
            help_url: 'https://dequeuniversity.com/rules/axe/4.6/color-contrast',
            html: '<button class="btn-primary">Click me</button>'
          },
          {
            id: 'issue-2',
            rule: 'image-alt',
            selector: 'img[src="logo.png"]',
            severity: 'critical',
            impact: 'critical',
            description: 'Ensures <img> elements have alternate text or a role of none or presentation',
            help_url: 'https://dequeuniversity.com/rules/axe/4.6/image-alt',
            html: '<img src="logo.png">'
          }
        ]
      }

      return NextResponse.json({ 
        success: true,
        scan: {
          ...mockScan,
          total_violations: mockScan.issues.length
        }
      })
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
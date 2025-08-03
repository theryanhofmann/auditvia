import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { getSupabaseClient, createAdminDisabledResponse } from '@/app/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/app/types/database'

interface RouteContext {
  params: Promise<{
    scanId: string
  }>
}

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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { scanId } = await context.params

    if (!scanId) {
      return NextResponse.json({ error: 'scanId is required' }, { status: 400 })
    }

    // DEV_NO_ADMIN bypass for testing
    if (process.env.DEV_NO_ADMIN === 'true') {
      // Return comprehensive mock scan data with violations
      const mockScan = {
        id: scanId,
        site_id: `site-${Date.now()}`,
        status: 'completed',
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        finished_at: new Date(Date.now() - 3570000).toISOString(), // 30 seconds later
        sites: {
          id: `site-${Date.now()}`,
          url: 'https://example.com',
          name: 'Example Website'
        },
        violations: [
          {
            id: 'image-alt',
            impact: 'critical',
            description: 'Ensures <img> elements have alternate text or a role of none or presentation',
            help: 'Images must have alternate text to give meaning to users using assistive technologies.',
            helpUrl: 'https://dequeuniversity.com/rules/axe/4.6/image-alt',
            nodes: [
              { 
                target: ['img.logo'],
                html: '<img class="logo" src="/logo.png" width="200" height="50">'
              },
              {
                target: ['img[src="hero.jpg"]'],
                html: '<img src="hero.jpg" class="hero-image">'
              }
            ]
          },
          {
            id: 'color-contrast',
            impact: 'serious',
            description: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds',
            help: 'Elements must have sufficient color contrast to be readable by users with visual impairments.',
            helpUrl: 'https://dequeuniversity.com/rules/axe/4.6/color-contrast',
            nodes: [
              {
                target: ['button.btn-secondary'],
                html: '<button class="btn btn-secondary">Learn More</button>'
              }
            ]
          }
        ]
      }

      return NextResponse.json({ 
        success: true,
        scan: {
          ...mockScan,
          duration: Math.round((new Date(mockScan.finished_at).getTime() - new Date(mockScan.created_at).getTime()) / 1000),
          total_violations: mockScan.violations.length,
          violations_by_impact: {
            critical: mockScan.violations.filter(v => v.impact === 'critical').length,
            serious: mockScan.violations.filter(v => v.impact === 'serious').length,
            moderate: mockScan.violations.filter(v => v.impact === 'moderate').length,
            minor: mockScan.violations.filter(v => v.impact === 'minor').length
          }
        }
      })
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

    // Fetch scan details with site info and user validation
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select(`
        id,
        site_id,
        user_id,
        status,
        started_at,
        finished_at,
        total_violations,
        passes,
        incomplete,
        inapplicable,
        scan_time_ms,
        created_at,
        updated_at,
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
      return NextResponse.json({ error: 'Scan not found or access denied' }, { status: 404 })
    }

    if (!scan) {
      console.error('No scan found')
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    const typedScan: ScanWithDetails = {
      ...scan,
      sites: scan.sites[0]
    }

    // Calculate duration and transform data
    const duration = typedScan.finished_at && typedScan.created_at
      ? Math.round((new Date(typedScan.finished_at).getTime() - new Date(typedScan.created_at).getTime()) / 1000)
      : null

    // Group violations by impact level
    const violationsByImpact = {
      critical: typedScan.issues?.filter(issue => issue.impact === 'critical').length || 0,
      serious: typedScan.issues?.filter(issue => issue.impact === 'serious').length || 0,
      moderate: typedScan.issues?.filter(issue => issue.impact === 'moderate').length || 0,
      minor: typedScan.issues?.filter(issue => issue.impact === 'minor').length || 0
    }

    // Transform issues to match expected format
    const violations = typedScan.issues?.map(issue => ({
      id: issue.rule,
      impact: issue.impact,
      description: issue.description,
      help: issue.description,
      helpUrl: issue.help_url,
      nodes: [{
        target: [issue.selector],
        html: issue.html
      }]
    })) || []

    return NextResponse.json({ 
      success: true,
      scan: {
        ...typedScan,
        duration,
        total_violations: typedScan.issues?.length || 0,
        violations_by_impact: violationsByImpact,
        violations
      }
    })
  } catch (error) {
    console.error('Error in GET /api/audit-results/[scanId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
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
        score: 85,
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
          },
          {
            id: 'heading-order',
            impact: 'moderate',
            description: 'Ensures the order of headings is semantically correct',
            help: 'Heading levels should increase by one and should not skip levels.',
            helpUrl: 'https://dequeuniversity.com/rules/axe/4.6/heading-order',
            nodes: [
              {
                target: ['h4.section-title'],
                html: '<h4 class="section-title">Features</h4>'
              }
            ]
          },
          {
            id: 'label',
            impact: 'minor',
            description: 'Ensures every form element has a label',
            help: 'Form elements must have labels to assist users using assistive technologies.',
            helpUrl: 'https://dequeuniversity.com/rules/axe/4.6/label',
            nodes: [
              {
                target: ['input[type="email"]'],
                html: '<input type="email" placeholder="Enter your email">'
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
        score,
        status,
        created_at,
        finished_at,
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

    // Calculate duration and transform data
    const duration = scan.finished_at && scan.created_at
      ? Math.round((new Date(scan.finished_at).getTime() - new Date(scan.created_at).getTime()) / 1000)
      : null

    // Group violations by impact level
    const violationsByImpact = {
      critical: scan.issues?.filter((issue: any) => issue.impact === 'critical').length || 0,
      serious: scan.issues?.filter((issue: any) => issue.impact === 'serious').length || 0,
      moderate: scan.issues?.filter((issue: any) => issue.impact === 'moderate').length || 0,
      minor: scan.issues?.filter((issue: any) => issue.impact === 'minor').length || 0
    }

    // Transform issues to match expected format
    const violations = scan.issues?.map((issue: any) => ({
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
        ...scan,
        duration,
        total_violations: scan.issues?.length || 0,
        violations_by_impact: violationsByImpact,
        violations
      }
    })
  } catch (error) {
    console.error('Error in GET /api/audit-results/[scanId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
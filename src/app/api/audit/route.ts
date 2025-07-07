import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { getSupabaseClient, createAdminDisabledResponse } from '@/app/lib/supabase/server'
import { Site } from '@/app/types/database'

export async function POST(request: NextRequest) {
  try {
    const { url, siteId, userId } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Ensure HTTPS
    if (!url.startsWith('https://')) {
      return NextResponse.json({ error: 'URL must use HTTPS' }, { status: 400 })
    }

    // DEV_NO_ADMIN bypass for testing
    if (process.env.DEV_NO_ADMIN === 'true') {
      // Run mock accessibility audit
      const auditResults = await runAccessibilityAudit(url)
      const score = calculateScore(auditResults.violations)
      
      const bySeverity = {
        critical: auditResults.violations.filter(v => v.impact === 'critical').length,
        serious: auditResults.violations.filter(v => v.impact === 'serious').length,
        moderate: auditResults.violations.filter(v => v.impact === 'moderate').length,
        minor: auditResults.violations.filter(v => v.impact === 'minor').length,
      }

      // Return mock scan data
      const mockScan = {
        id: `scan-${Date.now()}`,
        site_id: siteId || `site-${Date.now()}`,
        score,
        status: 'completed',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockSite = {
        id: siteId || `site-${Date.now()}`,
        url,
        name: getHostname(url),
        user_id: userId || 'test-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        monitoring_enabled: false,
      }

      return NextResponse.json({
        success: true,
        data: {
          site: mockSite,
          scan: mockScan,
        },
        summary: {
          score,
          violations: auditResults.violations.length,
          by_severity: bySeverity,
        },
      })
    }

    // Check for service key header (from Edge Function)
    const serviceKey = request.headers.get('x-service-key')
    const expectedServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    let supabase
    let authenticatedUserId = null
    
    if (serviceKey && expectedServiceKey && serviceKey === expectedServiceKey) {
      // Authenticated service call - use admin client directly
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      // For service calls, use the provided userId
      authenticatedUserId = userId
    } else {
      // Regular client call - require authentication
      const session = await getServerSession(authOptions)
      
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      authenticatedUserId = session.user.id
      
      supabase = await getSupabaseClient()
      if (!supabase) {
        return createAdminDisabledResponse()
      }
    }

    // Run accessibility audit using axe-core
    const auditResults = await runAccessibilityAudit(url)

    // Calculate score based on violations
    const score = calculateScore(auditResults.violations)

    // Process violations by severity
    const bySeverity = {
      critical: auditResults.violations.filter(v => v.impact === 'critical').length,
      serious: auditResults.violations.filter(v => v.impact === 'serious').length,
      moderate: auditResults.violations.filter(v => v.impact === 'moderate').length,
      minor: auditResults.violations.filter(v => v.impact === 'minor').length,
    }

    // Create or update site if siteId provided
    let site: Site | null = null
    if (siteId) {
      // Verify site belongs to authenticated user (for non-service calls)
      let siteQuery = supabase
        .from('sites')
        .select()
        .eq('id', siteId)
      
      // Add user restriction for regular authenticated calls
      if (!serviceKey) {
        siteQuery = siteQuery.eq('user_id', authenticatedUserId)
      }
      
      const { data: existingSite, error: fetchError } = await siteQuery.single()
      
      if (fetchError || !existingSite) {
        return NextResponse.json({ error: 'Site not found or access denied' }, { status: 404 })
      }
      
      // Update existing site
      const { data: updatedSite, error: updateError } = await supabase
        .from('sites')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', siteId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating site:', updateError)
        return NextResponse.json({ error: 'Failed to update site' }, { status: 500 })
      }
      
      site = updatedSite
    } else {
      // Create new site
      const { data: newSite, error: createError } = await supabase
        .from('sites')
        .insert({
          url,
          name: getHostname(url),
          user_id: authenticatedUserId,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating site:', createError)
        return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
      }

      site = newSite
    }

    // Create a scan record
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert({
        site_id: site?.id || siteId,
        score,
        status: 'completed',
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (scanError) {
      console.error('Error creating scan:', scanError)
      return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 })
    }

    // Create issue records for violations
    if (auditResults.violations.length > 0) {
      const issueInserts = auditResults.violations.map(violation => ({
        scan_id: scan.id,
        rule: violation.id || 'unknown',
        selector: violation.nodes?.[0]?.target?.[0] || 'unknown',
        severity: (violation.impact || 'minor') as 'critical' | 'serious' | 'moderate' | 'minor',
        impact: (violation.impact || 'minor') as 'critical' | 'serious' | 'moderate' | 'minor' | null,
        description: violation.description || null,
        help_url: violation.helpUrl || null,
        html: violation.nodes?.[0]?.html || null,
      }))

      const { error: issuesError } = await supabase
        .from('issues')
        .insert(issueInserts)

      if (issuesError) {
        console.error('Error creating issues:', issuesError)
        // Continue anyway, the scan was created successfully
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        site,
        scan,
      },
      summary: {
        score,
        violations: auditResults.violations.length,
        by_severity: bySeverity,
      },
    })

  } catch (error) {
    console.error('Audit API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function runAccessibilityAudit(url: string) {
  // In a real implementation, this would use puppeteer or similar to run axe on the actual page
  // For now, we'll simulate the audit results
  const mockViolations = [
    {
      id: 'color-contrast',
      impact: 'serious',
      description: 'Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds',
      help: 'Elements must have sufficient color contrast',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.6/color-contrast',
      nodes: [
        {
          any: [],
          all: [],
          none: [],
          impact: 'serious',
          html: '<button class="btn-primary">Click me</button>',
          target: ['button.btn-primary'],
          xpath: ['/html/body/div/button'],
          ancestry: ['html > body > div > button'],
          text: 'Click me',
        },
      ],
      tags: ['wcag2a', 'wcag143'],
    },
    {
      id: 'image-alt',
      impact: 'critical',
      description: 'Ensures <img> elements have alternate text or a role of none or presentation',
      help: 'Images must have alternate text',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.6/image-alt',
      nodes: [
        {
          any: [],
          all: [],
          none: [],
          impact: 'critical',
          html: '<img src="logo.png">',
          target: ['img[src="logo.png"]'],
          xpath: ['/html/body/img'],
          ancestry: ['html > body > img'],
          text: '',
        },
      ],
      tags: ['wcag2a', 'wcag111'],
    },
  ]

  // Simulate different results based on URL
  const domain = new URL(url).hostname
  const violationCount = domain.includes('test') ? 12 : 3

  return {
    violations: mockViolations.slice(0, violationCount),
    passes: [],
    incomplete: [],
    inapplicable: [],
  }
}

function calculateScore(violations: { impact: string }[]): number {
  if (violations.length === 0) return 100

  let deduction = 0
  violations.forEach(violation => {
    switch (violation.impact) {
      case 'critical':
        deduction += 25
        break
      case 'serious':
        deduction += 15
        break
      case 'moderate':
        deduction += 10
        break
      case 'minor':
        deduction += 5
        break
    }
  })

  return Math.max(0, 100 - deduction)
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase/server'
import { Site } from '@/app/types/dashboard'

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
      // Update existing site
      const { data: updatedSite, error: updateError } = await supabaseAdmin
        .from('sites')
        .update({
          score,
          last_scan: new Date().toISOString(),
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', siteId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating site:', updateError)
      } else {
        site = updatedSite
      }
    } else {
      // Create new site
      const { data: newSite, error: createError } = await supabaseAdmin
        .from('sites')
        .insert({
          url,
          name: getHostname(url),
          score,
          last_scan: new Date().toISOString(),
          status: 'completed',
          monitoring: false,
          user_id: userId || null,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating site:', createError)
        return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
      }

      site = newSite
    }

    // Save audit result to database
    const auditResultData = {
      site_id: site?.id || siteId,
      url,
      score,
      violations: auditResults.violations.length,
      by_severity: bySeverity,
      raw_violations: auditResults.violations,
      user_id: userId || null,
    }

    const { data: savedAuditResult, error: auditError } = await supabaseAdmin
      .from('audit_results')
      .insert(auditResultData)
      .select()
      .single()

    if (auditError) {
      console.error('Error saving audit result:', auditError)
      return NextResponse.json({ error: 'Failed to save audit result' }, { status: 500 })
    }

    // Update site with latest audit result ID
    if (site) {
      await supabaseAdmin
        .from('sites')
        .update({
          latest_audit_result_id: savedAuditResult.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', site.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        site,
        auditResult: savedAuditResult,
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
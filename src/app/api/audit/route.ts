import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { AccessibilityScanner } from '../../../../scripts/runA11yScan'
import type { Result } from 'axe-core'

interface AuditRequest {
  url: string
  siteId: string
  userId?: string
  waitForSelector?: string
}

export async function POST(request: Request) {
  try {
    // Initialize Supabase client with service role key
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    )

    console.log('🚀 Starting audit request...')
    const { url, siteId, userId, waitForSelector } = await request.json() as AuditRequest

    if (!url || !siteId) {
      console.error('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: url and siteId' },
        { status: 400 }
      )
    }

    // Verify site ownership if userId provided
    if (userId) {
      console.log('🔒 Verifying site ownership...')
      // First get the user's Supabase ID from their GitHub ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('github_id', userId as string)
        .single()

      if (userError || !user) {
        console.error('❌ User lookup failed:', userError)
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('id, url')
        .eq('id', siteId as string)
        .eq('user_id', user!.id as string)
        .single()

      if (siteError || !site) {
        console.error('❌ Site ownership verification failed:', siteError)
        return NextResponse.json(
          { error: 'Site not found or unauthorized' },
          { status: 403 }
        )
      }
      console.log('✅ Site ownership verified')
    }

    // Create scan record
    console.log('📝 Creating scan record...')
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .insert([{
        site_id: siteId as string,
        status: 'running',
        started_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (scanError || !scan) {
      console.error('❌ Failed to create scan record:', scanError)
      throw new Error('Failed to create scan record')
    }
    console.log('✅ Scan record created:', scan.id)

    // Run the accessibility scan
    console.log('🔍 Running accessibility scan...')
    const scanner = new AccessibilityScanner()
    let results
    try {
      results = await scanner.scan({
        url,
        waitForSelector,
        viewport: { width: 1280, height: 720 },
        timeout: 30000
      })
      console.log('✅ Scan completed')
    } catch (error) {
      console.error('❌ Scan failed:', error)
      
      // Update scan record as failed
      const { error: updateError } = await supabase
        .rpc('update_scan_record', {
          p_scan_id: scan!.id as string,
          p_status: 'failed',
          p_finished_at: new Date().toISOString(),
          p_total_violations: 0,
          p_passes: 0,
          p_incomplete: 0,
          p_inapplicable: 0,
          p_scan_time_ms: 0
        })

      if (updateError) {
        console.error('❌ Failed to update failed scan record:', JSON.stringify(updateError, null, 2))
      }

      throw error
    }

    // Store violations in the issues table
    if (results.violations.length > 0) {
      console.log(`📊 Storing ${results.violations.length} violations...`)
      const issuePromises = results.violations.map(async (violation: Result) => {
        // Get WCAG rule from tags
        const wcagTag = violation.tags.find(tag => tag.startsWith('wcag'))
        const wcagRule = wcagTag ? `WCAG ${wcagTag.slice(4, -1)}.${wcagTag.slice(-1).toUpperCase()}` : null

        // Process each node in the violation
        return Promise.all(violation.nodes.map(node => 
          supabase
            .from('issues')
            .insert([{
              scan_id: scan!.id as string,
              rule: violation.id,
              selector: node.target.join(', '),
              severity: violation.impact || 'minor',
              impact: violation.impact,
              description: violation.description,
              help_url: violation.helpUrl,
              html: node.html,
              failure_summary: node.failureSummary,
              wcag_rule: wcagRule
            }])
        ))
      })

      try {
        await Promise.all(issuePromises.flat())
        console.log('✅ Violations stored')
      } catch (error) {
        console.error('⚠️ Error storing violations:', error)
        // Continue execution - we don't want to fail the whole scan if issue storage fails
      }
    } else {
      console.log('ℹ️ No violations found')
    }

    // Update scan record with results
    console.log('📝 Updating scan record...')
    const { error: updateError } = await supabase
      .rpc('update_scan_record', {
        p_scan_id: scan!.id as string,
        p_status: 'completed',
        p_finished_at: new Date().toISOString(),
        p_total_violations: results.violations.length,
        p_passes: results.passes,
        p_incomplete: results.incomplete,
        p_inapplicable: results.inapplicable,
        p_scan_time_ms: results.timeToScan
      })

    if (updateError) {
      console.error('❌ Failed to update scan record:', updateError)
      throw new Error(`Failed to update scan record: ${updateError.message}`)
    }
    console.log('✅ Scan record updated')

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        scan: {
          id: scan!.id as string,
          status: 'completed',
          total_violations: results.violations.length,
          passes: results.passes,
          incomplete: results.incomplete,
          inapplicable: results.inapplicable,
          scan_time_ms: results.timeToScan
        }
      },
      summary: {
        violations: results.violations.length,
        passes: results.passes,
        incomplete: results.incomplete,
        inapplicable: results.inapplicable,
        scan_time_ms: results.timeToScan,
        by_impact: results.violations.reduce((acc, v) => {
          const impact = v.impact || 'minor'
          acc[impact] = (acc[impact] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    })

  } catch (error) {
    console.error('❌ Audit error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to run accessibility audit' 
      },
      { status: 500 }
    )
  }
} 
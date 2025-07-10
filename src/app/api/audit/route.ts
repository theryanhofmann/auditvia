import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/app/types/database'
import { cookies } from 'next/headers'
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
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set(name, '', options)
            } catch {
              // The `remove` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          }
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
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('id, url')
        .eq('id', siteId)
        .eq('user_id', userId)
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
      .insert({
        site_id: siteId,
        status: 'running',
        started_at: new Date().toISOString()
      })
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
      
      // Update scan record as failed with error message
      const { error: updateError } = await supabase
        .from('scans')
        .update({
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', scan.id)

      if (updateError) {
        console.error('❌ Failed to update failed scan record:', updateError)
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
            .insert({
              scan_id: scan.id,
              rule: violation.id,
              selector: node.target.join(', '),
              severity: violation.impact || 'minor',
              impact: violation.impact,
              description: violation.description,
              help_url: violation.helpUrl,
              html: node.html,
              failure_summary: node.failureSummary,
              wcag_rule: wcagRule
            })
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
      .from('scans')
      .update({
        status: 'completed',
        score: results.score,
        finished_at: new Date().toISOString(),
        total_violations: results.violations.length,
        passes: results.passes,
        incomplete: results.incomplete,
        inapplicable: results.inapplicable,
        scan_time_ms: results.timeToScan,
        error_message: null // Clear any previous error message
      })
      .eq('id', scan.id)

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
          id: scan.id,
          score: results.score,
          status: 'completed',
          total_violations: results.violations.length
        }
      },
      summary: {
        score: results.score,
        violations: results.violations.length,
        passes: results.passes,
        incomplete: results.incomplete,
        inapplicable: results.inapplicable,
        scan_time_ms: results.timeToScan
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
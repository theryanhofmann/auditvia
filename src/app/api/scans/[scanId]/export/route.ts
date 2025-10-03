import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { auth } from '@/auth'
import { verifyScanOwnership } from '@/app/lib/ownership'
import {
  generateMarkdownExport,
  generateCsvExport,
  generateExportFilename,
  getExportMimeType
} from '@/lib/export-scan-report'
import { scanAnalytics } from '@/lib/safe-analytics'

const MAX_EXPORT_ITEMS = 2000

interface RouteContext {
  params: Promise<{ scanId: string }>
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const startTime = Date.now()
  const params = await context.params
  const { scanId } = params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') as 'md' | 'csv' | null

  try {
    console.log(`📤 [export] Starting export for scan: ${scanId}, format: ${format}`)

    // Validate format
    if (!format || !['md', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Use ?format=md or ?format=csv' },
        { status: 400 }
      )
    }

    // Emit telemetry
    scanAnalytics.track('export_started', { scanId, format })

    // Verify authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Initialize Supabase
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify scan ownership (reuses existing ownership checks)
    const ownershipResult = await verifyScanOwnership(userId, scanId, '📤 [export]')
    
    if (!ownershipResult.allowed || !ownershipResult.site) {
      console.error(`📤 [export] Ownership check failed:`, ownershipResult.error)
      scanAnalytics.track('export_failed', { scanId, format, errorType: 'unauthorized' })
      return NextResponse.json(
        { error: ownershipResult.error?.message || 'Access denied' },
        { status: ownershipResult.error?.httpStatus || 403 }
      )
    }

    const site = ownershipResult.site

    // Fetch scan data
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('id, status, created_at, total_violations, passes, incomplete, inapplicable')
      .eq('id', scanId)
      .single()

    if (scanError || !scan) {
      console.error(`📤 [export] Failed to fetch scan:`, scanError)
      scanAnalytics.track('export_failed', { scanId, format, errorType: 'scan_not_found' })
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      )
    }

    // Check scan status
    if (scan.status !== 'completed') {
      console.log(`📤 [export] Scan not completed: ${scan.status}`)
      scanAnalytics.track('export_failed', { scanId, format, errorType: 'scan_not_completed' })
      return NextResponse.json(
        { error: 'Export only available for completed scans' },
        { status: 400 }
      )
    }

    // Fetch issues (limit to MAX_EXPORT_ITEMS)
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('id, rule, impact, description, help_url, selector, html')
      .eq('scan_id', scanId)
      .order('impact', { ascending: false })
      .limit(MAX_EXPORT_ITEMS)

    if (issuesError) {
      console.error(`📤 [export] Failed to fetch issues:`, issuesError)
      scanAnalytics.track('export_failed', { scanId, format, errorType: 'database_error' })
      return NextResponse.json(
        { error: 'Failed to fetch scan issues' },
        { status: 500 }
      )
    }

    const truncated = (issues?.length || 0) >= MAX_EXPORT_ITEMS
    const issueCount = issues?.length || 0

    console.log(`📤 [export] Fetched ${issueCount} issues${truncated ? ' (truncated)' : ''}`)

    // Prepare metadata
    const metadata = {
      scanId: scan.id,
      siteName: site.name || 'Unknown Site',
      siteUrl: site.url,
      scanDate: scan.created_at,
      score: calculateScore(scan),
      totalViolations: scan.total_violations || 0,
      passes: scan.passes || 0,
      incomplete: scan.incomplete || 0,
      inapplicable: scan.inapplicable || 0
    }

    // Generate export
    let content: string
    if (format === 'md') {
      content = generateMarkdownExport(issues || [], metadata, truncated)
    } else {
      content = generateCsvExport(issues || [], metadata, truncated)
    }

    // Generate filename
    const filename = generateExportFilename(site.name || 'unknown-site', scanId, format)
    const mimeType = getExportMimeType(format)

    const duration = Date.now() - startTime
    console.log(`📤 [export] Generated ${format.toUpperCase()} export in ${duration}ms`)

    // Emit success telemetry
    scanAnalytics.track('export_succeeded', {
      scanId,
      format,
      itemCount: issueCount,
      durationMs: duration
    })

    // Return file as download
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`📤 [export] Export failed after ${duration}ms:`, error)
    
    scanAnalytics.track('export_failed', {
      scanId,
      format: format || 'unknown',
      errorType: 'internal_error'
    })

    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}

/**
 * Calculate accessibility score
 */
function calculateScore(scan: any): number {
  const totalTests = (scan.passes || 0) + (scan.total_violations || 0) + (scan.incomplete || 0) + (scan.inapplicable || 0)
  if (totalTests === 0) return 0
  
  const successfulTests = (scan.passes || 0) + (scan.inapplicable || 0)
  const score = Math.round((successfulTests / totalTests) * 100)
  return Math.max(0, Math.min(100, score))
}
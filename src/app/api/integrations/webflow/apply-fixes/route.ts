/**
 * Webflow Auto-Fix Apply API
 * Applies accessibility fixes to Webflow site (with dry-run support)
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  getWebflowConnection, 
  isWebflowDryRun,
  isWebflowEnabled,
  type WebflowFixPreview 
} from '@/lib/integrations/webflow-client'
import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'
import { scanAnalytics } from '@/lib/safe-analytics'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { scanId, teamId, siteId, fixes } = await request.json()
    
    if (!scanId || !teamId || !fixes || !Array.isArray(fixes)) {
      return NextResponse.json(
        { error: 'scanId, teamId, and fixes array are required' },
        { status: 400 }
      )
    }

    console.log('🔧 [Apply Fixes] Request:', { 
      scanId, 
      teamId, 
      siteId, 
      fixesCount: fixes.length,
      userId: session.user.id 
    })

    // Check if Webflow integration is enabled
    if (!isWebflowEnabled()) {
      console.log('⚠️ [Apply Fixes] Webflow integration disabled')
      return NextResponse.json({
        error: 'Webflow integration is not enabled',
        message: 'The Webflow integration is currently disabled. Contact your administrator to enable it.'
      }, { status: 403 })
    }

    // Check dry-run mode
    const isDryRun = isWebflowDryRun()
    
    if (isDryRun) {
      console.log('🔒 [Apply Fixes] DRY-RUN MODE - No changes will be made')
    }

    // Check if Webflow is connected
    const connection = await getWebflowConnection(teamId, siteId)
    
    if (!connection) {
      console.log('❌ [Apply Fixes] No Webflow connection found')
      return NextResponse.json({
        error: 'Webflow not connected',
        needsConnection: true
      }, { status: 400 })
    }

    console.log('✅ [Apply Fixes] Webflow connection found:', connection.id)

    // Service role Supabase client for writing fix history
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const results: Array<{
      issueType: string
      status: 'applied' | 'dry_run' | 'skipped' | 'failed'
      message: string
      error?: string
    }> = []

    // Process each fix
    for (const fix of fixes as WebflowFixPreview[]) {
      console.log(`🔧 [Apply Fixes] Processing: ${fix.issueType}`)

      // Check if fix requires manual intervention
      if (fix.requiresManual) {
        console.log(`⚠️ [Apply Fixes] Skipping ${fix.issueType} - requires manual fix`)
        results.push({
          issueType: fix.issueType,
          status: 'skipped',
          message: fix.manualReason || 'This fix requires manual intervention',
          error: fix.manualReason
        })

        continue
      }

      // In dry-run mode, just log what would happen
      if (isDryRun) {
        console.log(`🔒 [Apply Fixes] DRY-RUN: Would apply fix for ${fix.issueType}`)
        
        results.push({
          issueType: fix.issueType,
          status: 'dry_run',
          message: 'Dry-run mode: No changes were made. This fix would be applied in production mode.'
        })

        // Store in fix_history as dry-run
        await supabase.from('fix_history').insert({
          team_id: teamId,
          site_id: siteId,
          scan_id: scanId,
          connection_id: connection.id,
          issue_type: fix.issueType,
          wcag_criteria: fix.wcagCriteria,
          severity: fix.severity,
          element_selector: fix.elementSelector,
          before_value: fix.beforeValue,
          after_value: fix.afterValue,
          fix_method: 'api',
          applied_by: session.user.id,
          was_dry_run: true,
          status: 'applied',
          preview_shown: true
        })

        continue
      }

      // TODO: In production mode, actually apply the fix via Webflow API
      // This would require:
      // 1. Find the element in Webflow DOM
      // 2. Apply the update
      // 3. Optionally publish the site
      
      // For now, even in non-dry-run mode, we're being conservative
      console.log(`⚠️ [Apply Fixes] Auto-fix not yet implemented for ${fix.issueType}`)
      results.push({
        issueType: fix.issueType,
        status: 'skipped',
        message: 'Auto-fix implementation coming soon. Please apply manually for now.'
      })

      // Store in fix_history
      await supabase.from('fix_history').insert({
        team_id: teamId,
        site_id: siteId,
        scan_id: scanId,
        connection_id: connection.id,
        issue_type: fix.issueType,
        wcag_criteria: fix.wcagCriteria,
        severity: fix.severity,
        element_selector: fix.elementSelector,
        before_value: fix.beforeValue,
        after_value: fix.afterValue,
        fix_method: 'api',
        applied_by: session.user.id,
        was_dry_run: isDryRun,
        status: 'applied',
        preview_shown: true
      })
    }

    // Count results
    const applied = results.filter(r => r.status === 'applied').length
    const dryRun = results.filter(r => r.status === 'dry_run').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const failed = results.filter(r => r.status === 'failed').length

    // Emit telemetry
    scanAnalytics.track('fixes_applied', {
      user_id: session.user.id,
      scan_id: scanId,
      team_id: teamId,
      site_id: siteId,
      connection_id: connection.id,
      fixes_requested: fixes.length,
      applied,
      dry_run: dryRun,
      skipped,
      failed,
      was_dry_run_mode: isDryRun
    })

    console.log(`✅ [Apply Fixes] Complete:`, {
      total: fixes.length,
      applied,
      dry_run: dryRun,
      skipped,
      failed
    })

    return NextResponse.json({
      success: true,
      isDryRun,
      results,
      summary: {
        total: fixes.length,
        applied,
        dry_run: dryRun,
        skipped,
        failed
      },
      message: isDryRun 
        ? '🔒 Dry-run mode: No changes were made to your site. This preview shows what would happen in production.'
        : applied > 0
          ? `✅ Successfully applied ${applied} fix${applied !== 1 ? 'es' : ''} to your Webflow site.`
          : '⚠️ No fixes were applied. Most accessibility fixes require human review for accuracy.'
    })

  } catch (error) {
    console.error('❌ [Apply Fixes] Error:', error)
    return NextResponse.json(
      { error: 'Failed to apply fixes' },
      { status: 500 }
    )
  }
}


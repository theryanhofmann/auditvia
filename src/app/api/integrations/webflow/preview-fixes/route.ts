/**
 * Webflow Auto-Fix Preview API
 * Analyzes issues and generates preview of fixes that can be applied
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWebflowConnection, generateWebflowFixPreviews } from '@/lib/integrations/webflow-client'
import { auth } from '@/auth'
import { createClient } from '@/app/lib/supabase/server'
import { scanAnalytics } from '@/lib/safe-analytics'

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { scanId, teamId, siteId } = await request.json()
    
    if (!scanId || !teamId) {
      return NextResponse.json(
        { error: 'scanId and teamId are required' },
        { status: 400 }
      )
    }

    console.log('🔍 [Fix Preview] Request:', { scanId, teamId, siteId, userId: session.user.id })

    // Check if Webflow is connected
    const connection = await getWebflowConnection(teamId, siteId)
    
    if (!connection) {
      console.log('❌ [Fix Preview] No Webflow connection found')
      return NextResponse.json({
        error: 'Webflow not connected',
        needsConnection: true
      }, { status: 400 })
    }

    console.log('✅ [Fix Preview] Webflow connection found:', connection.id)

    // Get scan issues from database
    const supabase = await createClient()
    
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('*')
      .eq('scan_id', scanId)
      .order('impact', { ascending: true }) // Critical first

    if (issuesError || !issues) {
      console.error('❌ [Fix Preview] Failed to fetch issues:', issuesError)
      return NextResponse.json(
        { error: 'Failed to fetch scan issues' },
        { status: 500 }
      )
    }

    console.log(`📊 [Fix Preview] Analyzing ${issues.length} issues`)

    // Generate fix previews
    const previews = await generateWebflowFixPreviews(issues, connection)

    // Emit telemetry
    scanAnalytics.track('fix_preview_requested', {
      user_id: session.user.id,
      scan_id: scanId,
      team_id: teamId,
      site_id: siteId,
      connection_id: connection.id,
      issues_analyzed: issues.length,
      fixes_available: previews.length,
      auto_fixable: previews.filter(p => p.canAutoFix).length,
      manual_required: previews.filter(p => p.requiresManual).length
    })

    console.log(`✅ [Fix Preview] Generated ${previews.length} previews`)

    return NextResponse.json({
      success: true,
      previews,
      summary: {
        total_issues: issues.length,
        previews_generated: previews.length,
        auto_fixable: previews.filter(p => p.canAutoFix).length,
        manual_required: previews.filter(p => p.requiresManual).length
      },
      connection: {
        id: connection.id,
        platform: 'webflow',
        status: connection.status
      }
    })

  } catch (error) {
    console.error('❌ [Fix Preview] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate fix preview' },
      { status: 500 }
    )
  }
}


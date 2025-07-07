import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'
import { runA11yScan } from '../../../../scripts/runA11yScan'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { siteId } = await request.json()

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify the user owns this site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, url')
      .eq('id', siteId)
      .eq('user_id', session.user.id)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found or access denied' }, { status: 404 })
    }

    let scanResult

    try {
      // Run real accessibility scan using Playwright + axe-core
      scanResult = await runA11yScan(site.url)
      
      // Insert scan record with real score
      const { data: scan, error: scanError } = await supabase
        .from('scans')
        .insert({
          site_id: siteId,
          score: scanResult.score,
          status: 'completed',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString()
        })
        .select()
        .single()

      if (scanError || !scan) {
        console.error('Error creating scan:', scanError)
        return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 })
      }



      // Bulk-insert real accessibility issues
      if (scanResult.issues.length > 0) {
        const issuesData = scanResult.issues.map(violation => ({
          scan_id: scan.id,
          rule: violation.id || 'unknown-rule',
          selector: violation.nodes?.[0]?.target?.[0] || 'unknown',
          severity: violation.impact || 'moderate',
          description: violation.description || 'No description available',
          impact: violation.impact || 'moderate',
          help_url: violation.helpUrl || null,
          html: violation.nodes?.[0]?.html || null
        }))

        const { error: issuesError } = await supabase
          .from('issues')
          .insert(issuesData)

        if (issuesError) {
          console.error('Error creating issues:', issuesError)
          return NextResponse.json({ error: 'Failed to create issues' }, { status: 500 })
        }
      }

      return NextResponse.json({ 
        ok: true,
        score: scanResult.score
      })

    } catch (scanError) {
      console.error('Error running accessibility scan:', scanError)
      
      // Insert scan record with error status
      await supabase
        .from('scans')
        .insert({
          site_id: siteId,
          score: null,
          status: 'failed',
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString()
        })
        .select()
        .single()

      return NextResponse.json({ 
        error: 'Failed to scan website for accessibility issues' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in POST /api/scan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, createAdminDisabledResponse } from '@/app/lib/supabase/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    // Get Supabase client (admin or regular based on DEV_NO_ADMIN flag)
    const supabase = await getSupabaseClient()
    if (!supabase) {
      return createAdminDisabledResponse()
    }
    
    // Fetch monitoring data for this site
    const { data: site, error } = await supabase
      .from('sites')
      .select(`
        id,
        url,
        name,
        created_at,
        scans (
          id,
          score,
          status,
          created_at,
          finished_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching site monitoring data:', error)
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Calculate monitoring metrics
    const scans = site.scans || []
    const averageScore = scans.length > 0 
      ? scans.reduce((sum, scan) => sum + (scan.score || 0), 0) / scans.length 
      : 0

    const monitoring = {
      site: {
        id: site.id,
        url: site.url,
        name: site.name,
        created_at: site.created_at
      },
      metrics: {
        total_scans: scans.length,
        average_score: Math.round(averageScore),
        latest_score: scans[0]?.score || 0,
        last_scan_at: scans[0]?.created_at || null
      },
      recent_scans: scans.slice(0, 10).map(scan => ({
        id: scan.id,
        score: scan.score,
        status: scan.status,
        created_at: scan.created_at,
        finished_at: scan.finished_at
      }))
    }

    return NextResponse.json({ monitoring })
  } catch (error) {
    console.error('Error in GET /api/sites/[id]/monitoring:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { enabled } = await request.json()

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }

    // Get session for user verification
    const session = await getServerSession(authOptions)
    
    // Get Supabase client (admin or regular based on DEV_NO_ADMIN flag)
    const supabase = await getSupabaseClient()
    if (!supabase) {
      return createAdminDisabledResponse()
    }

    // If using regular client (DEV_NO_ADMIN=true), verify user ownership
    if (process.env.DEV_NO_ADMIN === 'true') {
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // First verify the user owns this site
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('id, user_id')
        .eq('id', id)
        .single()

      if (siteError || !site) {
        return NextResponse.json({ error: 'Site not found' }, { status: 404 })
      }

      if (site.user_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden - you do not own this site' }, { status: 403 })
      }
    }

    // Update the monitoring status
    const { data: updatedSite, error: updateError } = await supabase
      .from('sites')
      .update({
        monitoring: enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, monitoring')
      .single()

    if (updateError) {
      console.error('Error updating site monitoring:', updateError)
      
      // Handle not found case
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Site not found' }, { status: 404 })
      }
      
      return NextResponse.json({ error: 'Failed to update monitoring status' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      monitoring: updatedSite.monitoring
    })

  } catch (error) {
    console.error('Error in PATCH /api/sites/[id]/monitoring:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
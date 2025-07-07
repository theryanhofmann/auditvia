import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, createAdminDisabledResponse } from '@/app/lib/supabase/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Supabase client (admin or regular based on DEV_NO_ADMIN flag)
    const supabase = await getSupabaseClient()
    if (!supabase) {
      return createAdminDisabledResponse()
    }

    // Get all sites for the user that need scheduled scanning
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select(`
        id,
        url,
        name,
        user_id,
        scans (
          created_at,
          score
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { referencedTable: 'scans', ascending: false })

    if (sitesError) {
      console.error('Error fetching sites for scheduled scans:', sitesError)
      return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
    }

    // Filter sites that haven't been scanned in the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const sitesToScan = sites?.filter(site => {
      const lastScan = site.scans?.[0]
      if (!lastScan) return true // Never scanned
      
      const lastScanDate = new Date(lastScan.created_at)
      return lastScanDate < sevenDaysAgo
    }) || []

    return NextResponse.json({ 
      sitesToScan: sitesToScan.map(site => ({
        id: site.id,
        url: site.url,
        name: site.name,
        lastScanDate: site.scans?.[0]?.created_at || null,
        lastScore: site.scans?.[0]?.score || null
      }))
    })
  } catch (error) {
    console.error('Error in GET /api/scheduled-scans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { siteId } = await request.json()

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    }

    // Get Supabase client (admin or regular based on DEV_NO_ADMIN flag)
    const supabase = await getSupabaseClient()
    if (!supabase) {
      return createAdminDisabledResponse()
    }

    // Get site details
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, url, name, user_id')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Trigger a new scan by calling the audit API internally
    const auditResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: site.url,
        siteId: site.id,
        userId: site.user_id
      })
    })

    if (!auditResponse.ok) {
      const error = await auditResponse.json()
      return NextResponse.json({ error: 'Failed to trigger scan: ' + error.error }, { status: 500 })
    }

    const auditResult = await auditResponse.json()
    
    return NextResponse.json({ 
      success: true,
      scan: auditResult.data.scan,
      message: 'Scheduled scan completed successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/scheduled-scans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
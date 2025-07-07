import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'

export async function GET() {
  // Bypass for CI testing in dev mode
  if (process.env.DEV_NO_ADMIN === 'true') {
    return NextResponse.json({ 
      sites: [
        {
          id: 'test-site-1',
          url: 'https://example.com',
          name: 'Test Site',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: 'test-user',
          monitoring: false,
          latest_score: 85,
          latest_scan_at: new Date().toISOString()
        }
      ]
    })
  }

  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    const { data: sites, error } = await supabase
      .from('sites')
      .select(`
        id,
        url,
        name,
        created_at,
        updated_at,
        user_id,
        monitoring,
        scans (
          score,
          created_at
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { referencedTable: 'scans', ascending: false })

    if (error) {
      console.error('Error fetching sites:', error)
      return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
    }

    // Map sites to include latest_score and latest_scan_at
    const mappedSites = sites?.map(site => ({
      ...site,
      latest_score: site.scans?.[0]?.score ?? null,
      latest_scan_at: site.scans?.[0]?.created_at ?? null
    })) || []

    return NextResponse.json({ sites: mappedSites })
  } catch (error) {
    console.error('Error in GET /api/sites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Bypass for CI testing in dev mode
  if (process.env.DEV_NO_ADMIN === 'true') {
    return NextResponse.json({ 
      success: true, 
      site: {
        id: 'test-site-' + Date.now(),
        url: 'https://example.com',
        name: 'Test Site',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'test-user',
        monitoring: false
      }
    }, { status: 201 })
  }

  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url, name } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    if (!url.startsWith('https://')) {
      return NextResponse.json({ error: 'URL must start with https://' }, { status: 400 })
    }

    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if site already exists for this user
    const { data: existingSite } = await supabase
      .from('sites')
      .select('id')
      .eq('url', url.trim())
      .eq('user_id', session.user.id)
      .single()

    if (existingSite) {
      return NextResponse.json({ error: 'Site already exists' }, { status: 409 })
    }

    // Insert the new site
    const { data: newSite, error } = await supabase
      .from('sites')
      .insert({
        url: url.trim(),
        name: name?.trim() || null,
        user_id: session.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating site:', error)
      return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
    }

    return NextResponse.json({ site: newSite }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/sites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
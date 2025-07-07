import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    let query = supabaseAdmin
      .from('sites')
      .select('*')
      .order('created_at', { ascending: false })

    // If userId is provided, filter by user
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: sites, error } = await query

    if (error) {
      console.error('Error fetching sites:', error)
      return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
    }

    return NextResponse.json({ sites })

  } catch (error) {
    console.error('Sites API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, name, description, userId } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .insert({
        url,
        name: name || getHostname(url),
        description,
        status: 'idle',
        monitoring: false,
        user_id: userId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating site:', error)
      return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
    }

    return NextResponse.json({ site })

  } catch (error) {
    console.error('Sites API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
} 
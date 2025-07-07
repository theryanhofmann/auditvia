import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let query = supabaseAdmin
      .from('audit_results')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by site if provided
    if (siteId) {
      query = query.eq('site_id', siteId)
    }

    // Filter by user if provided
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: auditResults, error } = await query

    if (error) {
      console.error('Error fetching audit results:', error)
      return NextResponse.json({ error: 'Failed to fetch audit results' }, { status: 500 })
    }

    return NextResponse.json({ auditResults })

  } catch (error) {
    console.error('Audit results API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { site_id, url, score, violations, by_severity, raw_violations, userId } = await request.json()

    if (!site_id || !url || score === undefined || violations === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: auditResult, error } = await supabaseAdmin
      .from('audit_results')
      .insert({
        site_id,
        url,
        score,
        violations,
        by_severity,
        raw_violations,
        user_id: userId || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating audit result:', error)
      return NextResponse.json({ error: 'Failed to create audit result' }, { status: 500 })
    }

    return NextResponse.json({ auditResult })

  } catch (error) {
    console.error('Audit results API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
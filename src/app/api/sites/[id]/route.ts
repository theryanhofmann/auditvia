import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, createAdminDisabledResponse } from '@/app/lib/supabase/server'

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
    
    const { data: site, error } = await supabase
      .from('sites')
      .select(`
        id,
        url,
        name,
        created_at,
        updated_at,
        user_id,
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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Site not found' }, { status: 404 })
      }
      console.error('Error fetching site:', error)
      return NextResponse.json({ error: 'Failed to fetch site' }, { status: 500 })
    }

    return NextResponse.json({ site })
  } catch (error) {
    console.error('Error in GET /api/sites/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { name } = await request.json()

    // Get Supabase client (admin or regular based on DEV_NO_ADMIN flag)
    const supabase = await getSupabaseClient()
    if (!supabase) {
      return createAdminDisabledResponse()
    }
    
    const { data: site, error } = await supabase
      .from('sites')
      .update({
        name: name?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Site not found' }, { status: 404 })
      }
      console.error('Error updating site:', error)
      return NextResponse.json({ error: 'Failed to update site' }, { status: 500 })
    }

    return NextResponse.json({ site })
  } catch (error) {
    console.error('Error in PUT /api/sites/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Get Supabase client (admin or regular based on DEV_NO_ADMIN flag)
    const supabase = await getSupabaseClient()
    if (!supabase) {
      return createAdminDisabledResponse()
    }
    
    const { error } = await supabase
      .from('sites')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting site:', error)
      return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/sites/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
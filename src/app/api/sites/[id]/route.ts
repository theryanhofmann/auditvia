import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching site:', error)
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    return NextResponse.json({ site })

  } catch (error) {
    console.error('Site API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const updates = await request.json()
    const { id } = await params

    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating site:', error)
      return NextResponse.json({ error: 'Failed to update site' }, { status: 500 })
    }

    return NextResponse.json({ site })

  } catch (error) {
    console.error('Site API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await supabaseAdmin
      .from('sites')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting site:', error)
      return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Site API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
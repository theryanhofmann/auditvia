import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { monitoring } = await request.json()
    const { id } = await params

    if (typeof monitoring !== 'boolean') {
      return NextResponse.json({ error: 'Monitoring must be a boolean' }, { status: 400 })
    }

    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .update({
        monitoring,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating site monitoring:', error)
      return NextResponse.json({ error: 'Failed to update monitoring' }, { status: 500 })
    }

    return NextResponse.json({ 
      site,
      message: monitoring ? 'Monitoring enabled' : 'Monitoring disabled' 
    })

  } catch (error) {
    console.error('Monitoring API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
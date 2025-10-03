import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/notifications/mark-read
 * Mark notifications as read or unread
 * 
 * Body: { ids: string[], read?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, read = true } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids must be a non-empty array' },
        { status: 400 }
      )
    }

    // For now, store read state in localStorage on client
    // In production, you would update a notifications table:
    /*
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read, updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', user.id)

    if (updateError) {
      throw updateError
    }
    */

    return NextResponse.json({
      success: true,
      updated: ids.length,
      read
    })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { siteId } = await params

    // Get session for user verification
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Supabase client with service role key
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First get the user's Supabase ID from their GitHub ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('github_id', session.user.id)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 })
    }

    if (!user) {
      console.error('User not found for GitHub ID:', session.user.id)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Now verify the user owns this site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, user_id')
      .eq('id', siteId)
      .eq('user_id', user.id)
      .single()

    if (siteError || !site) {
      console.error('Site not found or access denied:', siteError)
      return NextResponse.json({ error: 'Site not found or access denied' }, { status: 404 })
    }

    // Delete all related scans and issues first
    const { error: scansError } = await supabase
      .from('scans')
      .delete()
      .eq('site_id', siteId)

    if (scansError) {
      console.error('Error deleting scans:', scansError)
      return NextResponse.json({ error: 'Failed to delete site scans' }, { status: 500 })
    }

    // Now delete the site
    const { error: deleteError } = await supabase
      .from('sites')
      .delete()
      .eq('id', siteId)
      .eq('user_id', user.id) // Add user_id check for extra safety

    if (deleteError) {
      console.error('Error deleting site:', deleteError)
      return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in DELETE /api/sites/[siteId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
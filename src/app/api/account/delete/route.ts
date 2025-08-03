import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import type { Database } from '@/app/types/database'

export async function DELETE() {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Initialize Supabase client
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

    // Delete all user data in order (due to foreign key constraints)
    
    // 1. Delete issues (through scans cascade)
    const { error: issuesError } = await supabase
      .from('issues')
      .delete()
      .eq('user_id', user.id)

    if (issuesError) {
      console.error('Error deleting issues:', issuesError)
      return NextResponse.json({ error: 'Failed to delete user data' }, { status: 500 })
    }

    // 2. Delete scans
    const { error: scansError } = await supabase
      .from('scans')
      .delete()
      .eq('user_id', user.id)

    if (scansError) {
      console.error('Error deleting scans:', scansError)
      return NextResponse.json({ error: 'Failed to delete user data' }, { status: 500 })
    }

    // 3. Delete sites
    const { error: sitesError } = await supabase
      .from('sites')
      .delete()
      .eq('user_id', user.id)

    if (sitesError) {
      console.error('Error deleting sites:', sitesError)
      return NextResponse.json({ error: 'Failed to delete user data' }, { status: 500 })
    }

    // 4. Finally, delete the user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/account/delete:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
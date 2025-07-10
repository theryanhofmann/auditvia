import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import type { Database } from '@/app/types/database'

type TypedSupabaseClient = SupabaseClient<Database>

async function getOrCreateUser(supabase: TypedSupabaseClient, githubId: string): Promise<{ id: string }> {
  // Try to find existing user
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('github_id', githubId)
    .maybeSingle()

  if (fetchError) {
    console.error('Failed to fetch user:', fetchError)
    throw new Error('Failed to fetch user')
  }

  if (existingUser) {
    return existingUser
  }

  // Create new user if not found
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({ github_id: githubId })
    .select('id')
    .single()

  if (createError || !newUser) {
    console.error('Failed to create user:', createError)
    throw new Error('Failed to create user')
  }

  return newUser
}

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let supabaseUser
    try {
      supabaseUser = await getOrCreateUser(supabase, session.user.id)
      console.log('✅ Resolved Supabase user:', supabaseUser.id)
    } catch (error) {
      console.error('❌ Error getting/creating user:', error)
      return NextResponse.json(
        { error: 'Failed to verify user' },
        { status: 500 }
      )
    }

    // Fetch all scans for this site
    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select('*')
      .eq('site_id', params.siteId)
      .order('created_at', { ascending: false })

    if (scansError) {
      console.error('Error fetching scans:', scansError)
      return NextResponse.json(
        { error: 'Failed to fetch scans' },
        { status: 500 }
      )
    }

    return NextResponse.json({ scans })
  } catch (error) {
    console.error('Error in GET /api/sites/[siteId]/scans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
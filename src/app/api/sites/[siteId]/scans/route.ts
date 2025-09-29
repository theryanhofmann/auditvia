import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import type { Database } from '@/app/types/database'
import { verifySiteOwnership } from '@/app/lib/ownership'

// Force Node.js runtime for NextAuth session support
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    // Get the limit from query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '5')
    const { siteId } = await params

    // Verify authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify site ownership using centralized helper
    const ownershipResult = await verifySiteOwnership(session.user.id, siteId, '🔍 [scans]')
    
    if (!ownershipResult.allowed) {
      const { error } = ownershipResult
      return NextResponse.json({ error: error!.message }, { status: error!.httpStatus })
    }

    console.log(`🔍 [scans] ✅ Site ownership verified - user has role: ${ownershipResult.role}`)

    // Initialize Supabase client for data fetching
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch scans for the site (updated column names)
    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select('id, created_at, total_violations, status, finished_at')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (scansError) {
      console.error('Error fetching scans:', scansError)
      return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 })
    }

    return NextResponse.json({ scans: scans || [] })
  } catch (error) {
    console.error('Error in GET /api/sites/[siteId]/scans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
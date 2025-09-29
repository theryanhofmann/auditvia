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
    const { siteId } = await params

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify site ownership using centralized helper
    const ownershipResult = await verifySiteOwnership(session.user.id, siteId, '🔍 [sites-get]')
    
    if (!ownershipResult.allowed) {
      const { error } = ownershipResult
      return NextResponse.json({ error: error!.message }, { status: error!.httpStatus })
    }

    console.log(`🔍 [sites-get] ✅ Site ownership verified - user has role: ${ownershipResult.role}`)

    return NextResponse.json({ site: ownershipResult.site })
  } catch (error) {
    console.error('Error in GET /api/sites/[siteId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = await params

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, url, monitoring_enabled } = body

    // Verify site ownership using centralized helper
    const ownershipResult = await verifySiteOwnership(session.user.id, siteId, '🔧 [sites-put]')
    
    if (!ownershipResult.allowed) {
      const { error } = ownershipResult
      return NextResponse.json({ error: error!.message }, { status: error!.httpStatus })
    }

    // Only admins and owners can edit sites
    if (!['admin', 'owner'].includes(ownershipResult.role!)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    console.log(`🔧 [sites-put] ✅ Site ownership verified - user has role: ${ownershipResult.role}`)

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Update site
    const { data: site, error: updateError } = await supabase
      .from('sites')
      .update({
        name,
        url,
        monitoring_enabled
      })
      .eq('id', siteId)
      .eq('team_id', ownershipResult.site!.team_id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update site:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ site })
  } catch (error) {
    console.error('Error in PUT /api/sites/[siteId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  try {
    const { siteId } = await params

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify site ownership using centralized helper
    const ownershipResult = await verifySiteOwnership(session.user.id, siteId, '🗑️ [sites-delete]')
    
    if (!ownershipResult.allowed) {
      const { error } = ownershipResult
      return NextResponse.json({ error: error!.message }, { status: error!.httpStatus })
    }

    // Only admins and owners can delete sites
    if (!['admin', 'owner'].includes(ownershipResult.role!)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    console.log(`🗑️ [sites-delete] ✅ Site ownership verified - user has role: ${ownershipResult.role}`)

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Delete child records first (scans will cascade to issues)
    console.log('🗑️ Deleting scans for site:', siteId)
    const { error: scansDeleteError } = await supabase
      .from('scans')
      .delete()
      .eq('site_id', siteId)

    if (scansDeleteError) {
      console.error('Failed to delete scans:', scansDeleteError)
      // Continue anyway - site deletion might still work
    }

    // Delete site
    console.log('🗑️ Deleting site:', siteId)
    const { error: deleteError } = await supabase
      .from('sites')
      .delete()
      .eq('id', siteId)
      .eq('team_id', ownershipResult.site!.team_id)

    if (deleteError) {
      console.error('Failed to delete site:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    console.log('✅ Site deleted successfully')
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error in DELETE /api/sites/[siteId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
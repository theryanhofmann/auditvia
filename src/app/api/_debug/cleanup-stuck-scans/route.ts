import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { auth } from '@/auth'

// Force Node.js runtime for database operations
export const runtime = 'nodejs'

/**
 * Development utility to clean up stuck running scans
 * Only accessible in development or with proper admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Security check - only allow in development or for authenticated admin users
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (!isDevelopment) {
      // In production, require authentication and admin role
      const session = await auth()
      if (!session?.user?.email?.includes('@auditvia.com')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    console.log('🧹 [cleanup] Starting stuck scan cleanup utility...')

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const maxAgeMinutes = body.maxAgeMinutes || 15
    const dryRun = body.dryRun === true

    console.log(`🧹 [cleanup] Configuration: maxAge=${maxAgeMinutes}min, dryRun=${dryRun}`)

    // Find stuck running scans
    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString()
    
    const { data: stuckScans, error: findError } = await supabase
      .from('scans')
      .select('id, site_id, created_at, started_at, user_id')
      .eq('status', 'running')
      .lt('created_at', cutoffTime)
      .is('ended_at', null)
      .order('created_at', { ascending: true })

    if (findError) {
      console.error('🧹 [cleanup] Error finding stuck scans:', findError)
      return NextResponse.json({ 
        error: 'Failed to query stuck scans',
        details: findError.message 
      }, { status: 500 })
    }

    console.log(`🧹 [cleanup] Found ${stuckScans?.length || 0} stuck running scans`)

    if (!stuckScans || stuckScans.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No stuck scans found',
        scansFound: 0,
        scansUpdated: 0,
        dryRun
      })
    }

    let updatedCount = 0

    if (!dryRun) {
      // Update stuck scans to failed status
      const { error: updateError } = await supabase
        .from('scans')
        .update({
          status: 'failed',
          error_message: `Timed out – auto-marked failed by cleanup utility (stuck for ${maxAgeMinutes}+ minutes)`,
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('status', 'running')
        .lt('created_at', cutoffTime)
        .is('ended_at', null)

      if (updateError) {
        console.error('🧹 [cleanup] Error updating stuck scans:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update stuck scans',
          details: updateError.message 
        }, { status: 500 })
      }

      updatedCount = stuckScans.length
      console.log(`🧹 [cleanup] ✅ Successfully marked ${updatedCount} scans as failed`)
    } else {
      console.log(`🧹 [cleanup] 🔍 Dry run - would update ${stuckScans.length} scans`)
    }

    // Prepare detailed response
    const scanDetails = stuckScans.map(scan => ({
      scanId: scan.id,
      siteId: scan.site_id,
      userId: scan.user_id,
      createdAt: scan.created_at,
      ageMinutes: Math.round((Date.now() - new Date(scan.created_at).getTime()) / (1000 * 60))
    }))

    const response = {
      success: true,
      message: dryRun 
        ? `Found ${stuckScans.length} stuck scans (dry run - no changes made)`
        : `Successfully cleaned up ${updatedCount} stuck scans`,
      scansFound: stuckScans.length,
      scansUpdated: updatedCount,
      dryRun,
      maxAgeMinutes,
      cutoffTime,
      scanDetails: scanDetails.slice(0, 10), // Limit details to first 10 for readability
      totalDetails: scanDetails.length > 10 ? `... and ${scanDetails.length - 10} more` : null
    }

    console.log('🧹 [cleanup] Cleanup completed:', response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('🧹 [cleanup] Cleanup utility error:', error)
    return NextResponse.json({
      error: 'Cleanup utility failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET endpoint to check for stuck scans without modifying them
 */
export async function GET(request: NextRequest) {
  try {
    // Same security check as POST
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (!isDevelopment) {
      const session = await auth()
      if (!session?.user?.email?.includes('@auditvia.com')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const maxAgeMinutes = parseInt(searchParams.get('maxAge') || '15')

    const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString()
    
    const { data: stuckScans, error } = await supabase
      .from('scans')
      .select('id, site_id, created_at, started_at, user_id')
      .eq('status', 'running')
      .lt('created_at', cutoffTime)
      .is('ended_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const scanDetails = stuckScans?.map(scan => ({
      scanId: scan.id,
      siteId: scan.site_id,
      userId: scan.user_id,
      createdAt: scan.created_at,
      ageMinutes: Math.round((Date.now() - new Date(scan.created_at).getTime()) / (1000 * 60))
    })) || []

    return NextResponse.json({
      stuckScansFound: stuckScans?.length || 0,
      maxAgeMinutes,
      cutoffTime,
      scanDetails
    })

  } catch (error) {
    console.error('🧹 [cleanup-check] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

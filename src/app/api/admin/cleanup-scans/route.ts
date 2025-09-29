/**
 * Admin Cleanup Scans Endpoint
 * 
 * Provides administrative interface for cleaning up stuck scans.
 * Protected endpoint that requires authentication and admin privileges.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { scanMaintenanceManager } from '@/lib/scan-maintenance'

export const runtime = 'nodejs'

interface CleanupRequest {
  dryRun?: boolean
  maxRuntimeMinutes?: number
  heartbeatStaleMinutes?: number
  environment?: 'development' | 'staging' | 'production'
}

interface CleanupResponse {
  success: boolean
  dryRun: boolean
  cleanedCount: number
  scansProcessed: Array<{
    scanId: string
    reason: string
    ageMinutes: number
    heartbeatAgeMinutes: number
  }>
  healthMetrics: {
    totalScans: number
    runningScans: number
    staleScans: number
    timeoutScans: number
    healthScore: number
  }
  recommendations: string[]
  errors?: Array<{
    scanId: string
    error: string
  }>
  executionTime: number
}

/**
 * POST /api/admin/cleanup-scans
 * 
 * Cleans up stuck scans based on provided criteria
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Admin authorization check
    // In a real app, you'd check if the user has admin role
    // For now, we'll allow any authenticated user in development
    const isAdmin = process.env.NODE_ENV === 'development' || 
                   session.user.email?.endsWith('@auditvia.com') ||
                   process.env.ADMIN_USER_IDS?.split(',').includes(session.user.id)

    if (!isAdmin) {
      console.warn(`🔒 [admin-cleanup] Unauthorized access attempt by user ${session.user.id}`)
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    // Parse request body
    let requestData: CleanupRequest = {}
    try {
      const body = await request.text()
      if (body) {
        requestData = JSON.parse(body)
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const {
      dryRun = true, // Default to dry run for safety
      maxRuntimeMinutes,
      heartbeatStaleMinutes,
      environment
    } = requestData

    console.log(`🧹 [admin-cleanup] ${dryRun ? 'DRY RUN: ' : ''}Cleanup requested by ${session.user.email}`)
    console.log(`🧹 [admin-cleanup] Parameters:`, { 
      dryRun, 
      maxRuntimeMinutes, 
      heartbeatStaleMinutes, 
      environment 
    })

    // Determine cleanup criteria
    let criteria = scanMaintenanceManager.getEnvironmentCriteria()
    
    if (maxRuntimeMinutes !== undefined) {
      criteria.maxRuntimeMinutes = maxRuntimeMinutes
    }
    if (heartbeatStaleMinutes !== undefined) {
      criteria.heartbeatStaleMinutes = heartbeatStaleMinutes
    }

    // Override criteria based on environment parameter
    if (environment) {
      const envCriteria = {
        development: { maxRuntimeMinutes: 5, heartbeatStaleMinutes: 2 },
        staging: { maxRuntimeMinutes: 10, heartbeatStaleMinutes: 3 },
        production: { maxRuntimeMinutes: 15, heartbeatStaleMinutes: 5 }
      }
      criteria = { ...criteria, ...envCriteria[environment] }
    }

    // Run maintenance cycle
    const maintenanceResult = await scanMaintenanceManager.runMaintenanceCycle(dryRun)

    const response: CleanupResponse = {
      success: true,
      dryRun,
      cleanedCount: maintenanceResult.cleanup.cleanedCount,
      scansProcessed: maintenanceResult.cleanup.scansProcessed,
      healthMetrics: {
        totalScans: maintenanceResult.healthMetrics.totalScans,
        runningScans: maintenanceResult.healthMetrics.runningScans,
        staleScans: maintenanceResult.healthMetrics.staleScans,
        timeoutScans: maintenanceResult.healthMetrics.timeoutScans,
        healthScore: maintenanceResult.healthMetrics.healthScore
      },
      recommendations: maintenanceResult.recommendations,
      errors: maintenanceResult.cleanup.errors,
      executionTime: Date.now() - startTime
    }

    console.log(`🧹 [admin-cleanup] Completed in ${response.executionTime}ms`)
    console.log(`🧹 [admin-cleanup] Result: ${response.cleanedCount} scans ${dryRun ? 'would be' : 'were'} cleaned`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('🧹 [admin-cleanup] Cleanup failed:', error)
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTime: Date.now() - startTime
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

/**
 * GET /api/admin/cleanup-scans
 * 
 * Gets scan health metrics and identifies stuck scans without cleaning them
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Admin authorization check
    const isAdmin = process.env.NODE_ENV === 'development' || 
                   session.user.email?.endsWith('@auditvia.com') ||
                   process.env.ADMIN_USER_IDS?.split(',').includes(session.user.id)

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    console.log(`📊 [admin-cleanup] Health check requested by ${session.user.email}`)

    // Get health metrics and identify stuck scans (dry run)
    const maintenanceResult = await scanMaintenanceManager.runMaintenanceCycle(true)

    const response = {
      success: true,
      healthMetrics: maintenanceResult.healthMetrics,
      stuckScans: maintenanceResult.cleanup.scansProcessed,
      recommendations: maintenanceResult.recommendations,
      criteria: scanMaintenanceManager.getEnvironmentCriteria(),
      executionTime: Date.now() - startTime
    }

    console.log(`📊 [admin-cleanup] Health check completed in ${response.executionTime}ms`)
    console.log(`📊 [admin-cleanup] Health score: ${response.healthMetrics.healthScore}%`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('📊 [admin-cleanup] Health check failed:', error)
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      executionTime: Date.now() - startTime
    }

    return NextResponse.json(errorResponse, { status: 500 })
  }
}

/**
 * PUT /api/admin/cleanup-scans/[scanId]
 * 
 * Manually marks a specific scan as failed
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { scanId: string } }
): Promise<NextResponse> {
  try {
    // Authentication check
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Admin authorization check
    const isAdmin = process.env.NODE_ENV === 'development' || 
                   session.user.email?.endsWith('@auditvia.com') ||
                   process.env.ADMIN_USER_IDS?.split(',').includes(session.user.id)

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const scanId = params.scanId
    if (!scanId) {
      return NextResponse.json(
        { error: 'Scan ID is required' },
        { status: 400 }
      )
    }

    // Parse request body for reason
    let reason = 'Manual admin intervention'
    try {
      const body = await request.text()
      if (body) {
        const data = JSON.parse(body)
        reason = data.reason || reason
      }
    } catch (parseError) {
      // Use default reason if parsing fails
    }

    console.log(`🔧 [admin-cleanup] Manual scan failure requested by ${session.user.email} for scan ${scanId}`)

    // Mark scan as failed
    const result = await scanMaintenanceManager.markScanAsFailed(
      scanId, 
      reason, 
      session.user.id
    )

    if (result.success) {
      console.log(`🔧 [admin-cleanup] ✅ Successfully marked scan ${scanId} as failed`)
      return NextResponse.json({
        success: true,
        scanId,
        reason,
        markedBy: session.user.email
      })
    } else {
      console.error(`🔧 [admin-cleanup] ❌ Failed to mark scan ${scanId} as failed:`, result.error)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          scanId 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('🔧 [admin-cleanup] Manual scan failure failed:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

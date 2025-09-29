/**
 * Scan Maintenance System
 * 
 * Provides utilities for cleaning up stuck scans, monitoring scan health,
 * and maintaining the scan lifecycle. Prevents scans from remaining in
 * "running" state indefinitely.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { scanAnalytics } from './safe-analytics'

interface StuckScanCriteria {
  maxRuntimeMinutes: number
  heartbeatStaleMinutes: number
}

interface CleanupResult {
  cleanedCount: number
  scansProcessed: Array<{
    scanId: string
    reason: 'runtime_timeout' | 'heartbeat_stale'
    ageMinutes: number
    heartbeatAgeMinutes: number
  }>
  errors: Array<{
    scanId: string
    error: string
  }>
}

interface ScanHealthMetrics {
  totalScans: number
  runningScans: number
  staleScans: number
  timeoutScans: number
  averageRuntimeMinutes: number
  oldestRunningMinutes: number
  healthScore: number // 0-100
}

export class ScanMaintenanceManager {
  private supabase: ReturnType<typeof createClient<Database>>

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false }
      }
    )
  }

  /**
   * Identifies and cleans up stuck scans
   */
  async cleanupStuckScans(
    criteria: StuckScanCriteria = {
      maxRuntimeMinutes: 15,
      heartbeatStaleMinutes: 5
    },
    dryRun: boolean = false
  ): Promise<CleanupResult> {
    console.log(`🧹 [maintenance] ${dryRun ? 'DRY RUN: ' : ''}Cleaning up stuck scans...`)
    console.log(`🧹 [maintenance] Criteria: max runtime ${criteria.maxRuntimeMinutes}min, heartbeat stale ${criteria.heartbeatStaleMinutes}min`)

    const result: CleanupResult = {
      cleanedCount: 0,
      scansProcessed: [],
      errors: []
    }

    try {
      // Use the database function for consistent logic
      const { data, error } = await this.supabase.rpc('cleanup_stuck_scans_v2', {
        max_age_minutes: criteria.maxRuntimeMinutes,
        heartbeat_stale_minutes: criteria.heartbeatStaleMinutes,
        dry_run: dryRun
      })

      if (error) {
        console.error('🧹 [maintenance] Cleanup RPC failed:', error)
        throw new Error(`Cleanup RPC failed: ${error.message}`)
      }

      if (data && Array.isArray(data)) {
        result.scansProcessed = data.map(row => ({
          scanId: row.scan_id,
          reason: row.reason as 'runtime_timeout' | 'heartbeat_stale',
          ageMinutes: row.age_minutes,
          heartbeatAgeMinutes: row.heartbeat_age_minutes
        }))

        result.cleanedCount = result.scansProcessed.length

        console.log(`🧹 [maintenance] ${dryRun ? 'Would clean' : 'Cleaned'} ${result.cleanedCount} stuck scans`)

        // Log each scan processed
        for (const scan of result.scansProcessed) {
          console.log(`🧹 [maintenance] - Scan ${scan.scanId}: ${scan.reason} (age: ${scan.ageMinutes}min, heartbeat: ${scan.heartbeatAgeMinutes}min)`)
          
          // Analytics for actual cleanup (not dry run)
          if (!dryRun) {
            scanAnalytics.failed(scan.scanId, '', '', `Cleanup: ${scan.reason}`, {
              cleanup_reason: scan.reason,
              age_minutes: scan.ageMinutes,
              heartbeat_age_minutes: scan.heartbeatAgeMinutes
            })
          }
        }

        // Log cleanup event if not dry run
        if (!dryRun && result.cleanedCount > 0) {
          await this.logMaintenanceEvent('cleanup_stuck_scans', {
            cleaned_count: result.cleanedCount,
            criteria,
            scans_processed: result.scansProcessed
          })
        }
      }

      return result

    } catch (error) {
      console.error('🧹 [maintenance] Cleanup failed:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      result.errors.push({ scanId: 'all', error: errorMessage })
      return result
    }
  }

  /**
   * Gets comprehensive health metrics for scan system
   */
  async getScanHealthMetrics(): Promise<ScanHealthMetrics> {
    console.log('📊 [maintenance] Calculating scan health metrics...')

    try {
      // Get basic scan counts
      const { data: scanCounts, error: countsError } = await this.supabase
        .from('scans')
        .select('status, created_at, last_activity_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours

      if (countsError) {
        throw new Error(`Failed to fetch scan counts: ${countsError.message}`)
      }

      const now = new Date()
      const scans = scanCounts || []
      
      const totalScans = scans.length
      const runningScans = scans.filter(s => s.status === 'running').length
      
      // Calculate stale and timeout scans
      let staleScans = 0
      let timeoutScans = 0
      let totalRuntimeMinutes = 0
      let oldestRunningMinutes = 0

      for (const scan of scans) {
        const createdAt = new Date(scan.created_at)
        const lastActivity = new Date(scan.last_activity_at || scan.created_at)
        const runtimeMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)
        
        if (scan.status === 'running') {
          const heartbeatAgeMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60)
          
          if (heartbeatAgeMinutes > 5) staleScans++
          if (runtimeMinutes > 15) timeoutScans++
          
          oldestRunningMinutes = Math.max(oldestRunningMinutes, runtimeMinutes)
        }
        
        if (scan.status === 'completed' || scan.status === 'failed') {
          totalRuntimeMinutes += runtimeMinutes
        }
      }

      const completedScans = scans.filter(s => s.status === 'completed' || s.status === 'failed').length
      const averageRuntimeMinutes = completedScans > 0 ? totalRuntimeMinutes / completedScans : 0

      // Calculate health score (0-100)
      let healthScore = 100
      if (runningScans > 0) {
        const stalePercentage = (staleScans / runningScans) * 100
        const timeoutPercentage = (timeoutScans / runningScans) * 100
        healthScore = Math.max(0, 100 - stalePercentage - timeoutPercentage)
      }

      const metrics: ScanHealthMetrics = {
        totalScans,
        runningScans,
        staleScans,
        timeoutScans,
        averageRuntimeMinutes: Math.round(averageRuntimeMinutes * 100) / 100,
        oldestRunningMinutes: Math.round(oldestRunningMinutes * 100) / 100,
        healthScore: Math.round(healthScore)
      }

      console.log('📊 [maintenance] Health metrics:', metrics)
      return metrics

    } catch (error) {
      console.error('📊 [maintenance] Failed to calculate health metrics:', error)
      throw error
    }
  }

  /**
   * Validates that a specific scan is healthy (not stuck)
   */
  async validateScanHealth(scanId: string): Promise<{
    healthy: boolean
    issues: string[]
    scan?: any
  }> {
    try {
      const { data: scan, error } = await this.supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single()

      if (error) {
        return {
          healthy: false,
          issues: [`Scan not found: ${error.message}`]
        }
      }

      const issues: string[] = []
      const now = new Date()
      const createdAt = new Date(scan.created_at)
      const lastActivity = new Date(scan.last_activity_at || scan.created_at)

      // Check runtime timeout
      const runtimeMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60)
      const maxRuntime = scan.max_runtime_minutes || 15
      if (scan.status === 'running' && runtimeMinutes > maxRuntime) {
        issues.push(`Runtime exceeded: ${Math.round(runtimeMinutes)}min > ${maxRuntime}min`)
      }

      // Check heartbeat staleness
      const heartbeatAgeMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60)
      const heartbeatInterval = scan.heartbeat_interval_seconds || 30
      const staleThreshold = (heartbeatInterval * 3) / 60 // 3x interval in minutes
      if (scan.status === 'running' && heartbeatAgeMinutes > staleThreshold) {
        issues.push(`Heartbeat stale: ${Math.round(heartbeatAgeMinutes)}min > ${Math.round(staleThreshold)}min`)
      }

      // Check for terminal state without ended_at
      if ((scan.status === 'completed' || scan.status === 'failed') && !scan.ended_at) {
        issues.push('Terminal state missing ended_at timestamp')
      }

      return {
        healthy: issues.length === 0,
        issues,
        scan
      }

    } catch (error) {
      return {
        healthy: false,
        issues: [`Validation error: ${error instanceof Error ? error.message : String(error)}`]
      }
    }
  }

  /**
   * Manually marks a specific scan as failed (for admin use)
   */
  async markScanAsFailed(
    scanId: string,
    reason: string = 'Manual intervention',
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`🔧 [maintenance] Manually marking scan ${scanId} as failed: ${reason}`)

    try {
      const { error } = await this.supabase.rpc('transition_scan_to_terminal', {
        scan_id: scanId,
        new_status: 'failed',
        end_time: new Date().toISOString(),
        error_msg: reason,
        final_progress_msg: 'Scan manually marked as failed'
      })

      if (error) {
        console.error(`🔧 [maintenance] Failed to mark scan ${scanId} as failed:`, error)
        return { success: false, error: error.message }
      }

      // Log the manual intervention
      await this.logMaintenanceEvent('manual_scan_failure', {
        scan_id: scanId,
        reason,
        user_id: userId
      })

      // Analytics
      if (userId) {
        scanAnalytics.failed(scanId, '', userId, reason, {
          manual_intervention: true
        })
      }

      console.log(`🔧 [maintenance] ✅ Successfully marked scan ${scanId} as failed`)
      return { success: true }

    } catch (error) {
      console.error(`🔧 [maintenance] Exception marking scan ${scanId} as failed:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Gets environment-appropriate cleanup criteria
   */
  getEnvironmentCriteria(): StuckScanCriteria {
    const environment = process.env.NODE_ENV || 'development'
    const deploymentEnv = process.env.DEPLOYMENT_ENV || process.env.VERCEL_ENV || environment
    
    // Check for development environment
    if (environment === 'development') {
      return {
        maxRuntimeMinutes: 5,
        heartbeatStaleMinutes: 2
      }
    }
    
    // Check for staging environment (via custom env vars)
    if (deploymentEnv === 'staging' || deploymentEnv === 'preview') {
      return {
        maxRuntimeMinutes: 10,
        heartbeatStaleMinutes: 3
      }
    }
    
    // Production defaults
    return {
      maxRuntimeMinutes: 15,
      heartbeatStaleMinutes: 5
    }
  }

  /**
   * Logs maintenance events for observability
   */
  private async logMaintenanceEvent(
    eventType: string,
    eventData: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase
        .from('scan_lifecycle_events')
        .insert({
          scan_id: null, // System-level event
          event_type: 'cleanup_performed',
          event_data: {
            maintenance_type: eventType,
            timestamp: new Date().toISOString(),
            ...eventData
          }
        })
    } catch (error) {
      console.warn(`📊 [maintenance] Failed to log maintenance event ${eventType}:`, error)
    }
  }

  /**
   * Runs a comprehensive maintenance cycle
   */
  async runMaintenanceCycle(dryRun: boolean = false): Promise<{
    cleanup: CleanupResult
    healthMetrics: ScanHealthMetrics
    recommendations: string[]
  }> {
    console.log(`🔄 [maintenance] ${dryRun ? 'DRY RUN: ' : ''}Running maintenance cycle...`)

    const criteria = this.getEnvironmentCriteria()
    const cleanup = await this.cleanupStuckScans(criteria, dryRun)
    const healthMetrics = await this.getScanHealthMetrics()

    const recommendations: string[] = []

    // Generate recommendations based on health metrics
    if (healthMetrics.healthScore < 80) {
      recommendations.push(`Health score is low (${healthMetrics.healthScore}%). Consider investigating scan reliability.`)
    }

    if (healthMetrics.staleScans > 0) {
      recommendations.push(`${healthMetrics.staleScans} scans have stale heartbeats. Check scan execution environment.`)
    }

    if (healthMetrics.timeoutScans > 0) {
      recommendations.push(`${healthMetrics.timeoutScans} scans exceeded runtime limits. Consider increasing timeouts or optimizing scan performance.`)
    }

    if (healthMetrics.averageRuntimeMinutes > 5) {
      recommendations.push(`Average runtime is high (${healthMetrics.averageRuntimeMinutes}min). Consider performance optimization.`)
    }

    console.log(`🔄 [maintenance] Maintenance cycle complete. Health score: ${healthMetrics.healthScore}%`)
    
    return {
      cleanup,
      healthMetrics,
      recommendations
    }
  }
}

// Export singleton instance
export const scanMaintenanceManager = new ScanMaintenanceManager()

// Export class for custom configurations (already exported above)
// Note: Class is already exported in the class declaration

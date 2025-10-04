/**
 * Scan Lifecycle Manager
 * 
 * Centralizes scan state transitions with schema-cache recovery, heartbeat monitoring,
 * and guaranteed terminal states. Prevents endless scanning loops by ensuring all
 * scans reach completed or failed status.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { getSchemaCapabilities } from './schema-capabilities'
import { 
  refreshSchemaCache, 
   
  classifyDatabaseError,
  calculateBackoffDelay,
  sleep,
  formatDatabaseError
} from './schema-cache-recovery'
import { scanAnalytics } from './safe-analytics'

interface ScanUpdateData {
  status?: 'queued' | 'running' | 'completed' | 'failed'
  progress_message?: string
  error_message?: string
  ended_at?: string
  last_activity_at?: string
  [key: string]: any
}

interface LifecycleManagerConfig {
  maxRetries: number
  baseDelayMs: number
  enableRecovery: boolean
  enableAnalytics: boolean
}

interface RecoveryAttempt {
  attempt: number
  error: any
  recoveryMethod?: string
  success: boolean
  duration: number
}

export class ScanLifecycleManager {
  private supabase: ReturnType<typeof createClient<Database>>
  private config: LifecycleManagerConfig

  constructor(config: Partial<LifecycleManagerConfig> = {}) {
    this.config = {
      maxRetries: 3,
      baseDelayMs: 1000,
      enableRecovery: true,
      enableAnalytics: true,
      ...config
    }

    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false }
      }
    )
  }

  /**
   * Updates scan heartbeat to indicate the scan is still active
   */
  async updateHeartbeat(
    scanId: string, 
    progressMessage?: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    console.log(`💓 [lifecycle] Updating heartbeat for scan ${scanId}${progressMessage ? `: ${progressMessage}` : ''}`)

    try {
      const capabilities = await getSchemaCapabilities()
      
      if (!capabilities.hasHeartbeatRpc) {
        console.debug(`💓 [lifecycle] Heartbeat RPC not available, using no-op for scan ${scanId}`)
        // Still fire analytics if enabled
        if (this.config.enableAnalytics && userId) {
          scanAnalytics.progress(scanId, userId, progressMessage || 'Heartbeat updated (no-op)')
        }
        return { success: true }
      }

      const { error } = await this.supabase.rpc('update_scan_heartbeat', {
        scan_id: scanId,
        progress_msg: progressMessage || null
      })

      if (error) {
        // Check if this is a missing RPC error
        if (error.code === 'PGRST202') {
          console.debug(`💓 [lifecycle] Heartbeat RPC missing for scan ${scanId}, using no-op`)
          return { success: true }
        }
        
        console.error(`💓 [lifecycle] Heartbeat update failed for ${scanId}:`, error)
        return { success: false, error: error.message }
      }

      // Log lifecycle event
      await this.logLifecycleEvent(scanId, 'heartbeat_updated', {
        progress_message: progressMessage,
        timestamp: new Date().toISOString()
      })

      // Analytics
      if (this.config.enableAnalytics && userId) {
        scanAnalytics.progress(scanId, userId, progressMessage || 'Heartbeat updated')
      }

      return { success: true }
    } catch (error) {
      console.warn(`💓 [lifecycle] Heartbeat update exception for ${scanId}, continuing with no-op:`, error)
      // Don't fail the scan for heartbeat issues
      return { success: true }
    }
  }

  /**
   * Transitions scan to terminal state (completed or failed) with recovery
   */
  async transitionToTerminal(
    scanId: string,
    status: 'completed' | 'failed',
    metadata: {
      errorMessage?: string
      progressMessage?: string
      userId?: string
      siteId?: string
      results?: any
    } = {}
  ): Promise<{ success: boolean; error?: string; recoveryAttempts?: RecoveryAttempt[] }> {
    console.log(`🏁 [lifecycle] Transitioning scan ${scanId} to ${status}`)

    const recoveryAttempts: RecoveryAttempt[] = []
    const startTime = Date.now()

    try {
      const capabilities = await getSchemaCapabilities()
      const now = new Date().toISOString()
      
      // Build update payload based on available columns
      const updatePayload: any = {
        status,
        updated_at: now
      }
      
      if (capabilities.hasEndedAt) {
        updatePayload.ended_at = now
      }
      
      if (capabilities.hasLastActivityAt) {
        updatePayload.last_activity_at = now
      }
      
      if (capabilities.hasProgressMessage) {
        updatePayload.progress_message = metadata.progressMessage || (status === 'completed' ? 'Scan completed successfully' : 'Scan failed')
      }
      
      if (status === 'failed' && metadata.errorMessage) {
        updatePayload.error_message = metadata.errorMessage
      }

      const result = await this.updateWithRecovery(scanId, updatePayload, recoveryAttempts)

      if (result.success) {
        // Log lifecycle event
        await this.logLifecycleEvent(scanId, status === 'completed' ? 'scan_completed' : 'scan_failed', {
          error_message: metadata.errorMessage,
          duration_ms: Date.now() - startTime,
          recovery_attempts: recoveryAttempts.length,
          results: metadata.results
        })

        // Analytics - only emit if siteId is available to prevent blank siteId events
        if (this.config.enableAnalytics && metadata.userId && metadata.siteId) {
          if (status === 'completed') {
            scanAnalytics.completed(scanId, metadata.siteId, metadata.userId, { 
              duration: Date.now() - startTime,
              recovery_attempts: recoveryAttempts.length 
            })
          } else {
            scanAnalytics.failed(scanId, metadata.siteId, metadata.userId, metadata.errorMessage || 'Unknown error', {
              recovery_attempts: recoveryAttempts.length
            })
          }
        }

        console.log(`🏁 [lifecycle] ✅ Scan ${scanId} successfully transitioned to ${status}`)
        return { success: true, recoveryAttempts }
      }

      console.error(`🏁 [lifecycle] ❌ Failed to transition scan ${scanId} to ${status}:`, result.error)
      return { success: false, error: result.error, recoveryAttempts }

    } catch (error) {
      console.error(`🏁 [lifecycle] Exception during terminal transition for ${scanId}:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        recoveryAttempts 
      }
    }
  }

  /**
   * Updates scan with automatic schema-cache recovery
   */
  async updateWithRecovery(
    scanId: string,
    updateData: ScanUpdateData,
    recoveryAttempts: RecoveryAttempt[] = []
  ): Promise<{ success: boolean; error?: string }> {
    let lastError: any = null

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`🔄 [lifecycle] Update attempt ${attempt + 1}/${this.config.maxRetries + 1} for scan ${scanId}`)

        const { error } = await this.supabase
          .from('scans')
          .update(updateData)
          .eq('id', scanId)

        if (!error) {
          console.log(`🔄 [lifecycle] ✅ Update successful for scan ${scanId} on attempt ${attempt + 1}`)
          return { success: true }
        }

        lastError = error
        const classification = classifyDatabaseError(error)
        
        console.warn(`🔄 [lifecycle] Update failed for scan ${scanId} (attempt ${attempt + 1}):`, {
          error: error.message,
          code: error.code,
          classification
        })

        // If this is a schema cache error and recovery is enabled, try to recover
        if (classification.type === 'schema_cache' && this.config.enableRecovery && attempt < this.config.maxRetries) {
          const recoveryStart = Date.now()
          console.log(`🔄 [lifecycle] Attempting schema cache recovery for scan ${scanId}`)

          const recoveryResult = await refreshSchemaCache()
          const recoveryDuration = Date.now() - recoveryStart

          const recoveryAttempt: RecoveryAttempt = {
            attempt: attempt + 1,
            error,
            recoveryMethod: recoveryResult.method,
            success: recoveryResult.success,
            duration: recoveryDuration
          }
          recoveryAttempts.push(recoveryAttempt)

          // Log recovery attempt
          await this.logLifecycleEvent(scanId, 
            recoveryResult.success ? 'schema_recovery_succeeded' : 'schema_recovery_failed', 
            {
              attempt: attempt + 1,
              method: recoveryResult.method,
              duration_ms: recoveryDuration,
              error: recoveryResult.error
            }
          )

          if (recoveryResult.success) {
            // Wait before retry as suggested by recovery
            const waitTime = recoveryResult.retryAfterMs || calculateBackoffDelay(attempt, this.config.baseDelayMs)
            console.log(`🔄 [lifecycle] Recovery succeeded, waiting ${waitTime}ms before retry`)
            await sleep(waitTime)
            continue // Retry the update
          } else {
            console.error(`🔄 [lifecycle] Schema recovery failed for scan ${scanId}:`, recoveryResult.error)
          }
        }

        // If not recoverable or recovery failed, wait before next attempt
        if (attempt < this.config.maxRetries) {
          const backoffDelay = calculateBackoffDelay(attempt, this.config.baseDelayMs)
          console.log(`🔄 [lifecycle] Waiting ${backoffDelay}ms before next attempt`)
          await sleep(backoffDelay)
        }

      } catch (exception) {
        lastError = exception
        console.error(`🔄 [lifecycle] Exception during update attempt ${attempt + 1} for scan ${scanId}:`, exception)
        
        if (attempt < this.config.maxRetries) {
          const backoffDelay = calculateBackoffDelay(attempt, this.config.baseDelayMs)
          await sleep(backoffDelay)
        }
      }
    }

    // All retries failed - attempt minimal safe fallback update
    console.error(`🔄 [lifecycle] All retries failed for scan ${scanId}, attempting minimal fallback update`)
    return await this.fallbackMinimalUpdate(scanId, updateData, lastError)
  }

  /**
   * Fallback update using only guaranteed-safe columns
   */
  private async fallbackMinimalUpdate(
    scanId: string,
    originalUpdateData: ScanUpdateData,
    originalError: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Use only columns that are guaranteed to exist
      const safeUpdateData: any = {
        updated_at: new Date().toISOString()
      }

      // Add status if it was being updated and is a safe value
      if (originalUpdateData.status && ['completed', 'failed'].includes(originalUpdateData.status)) {
        safeUpdateData.status = originalUpdateData.status
      }

      // Try to add error message to an existing safe field
      if (originalUpdateData.status === 'failed' && originalUpdateData.error_message) {
        // Try to use error_message if it exists, otherwise fall back to a safe approach
        safeUpdateData.error_message = `Fallback update: ${originalUpdateData.error_message}`
      }

      console.log(`🔄 [lifecycle] Attempting minimal fallback update for scan ${scanId}:`, safeUpdateData)

      const { error } = await this.supabase
        .from('scans')
        .update(safeUpdateData)
        .eq('id', scanId)

      if (!error) {
        console.log(`🔄 [lifecycle] ✅ Minimal fallback update succeeded for scan ${scanId}`)
        
        // Log the fallback
        await this.logLifecycleEvent(scanId, 'schema_recovery_failed', {
          fallback_used: true,
          original_error: formatDatabaseError(originalError).logMessage,
          safe_update_data: safeUpdateData
        })

        return { success: true }
      }

      console.error(`🔄 [lifecycle] ❌ Even minimal fallback failed for scan ${scanId}:`, error)
      return { success: false, error: `Fallback update failed: ${error.message}` }

    } catch (exception) {
      console.error(`🔄 [lifecycle] Exception during fallback update for scan ${scanId}:`, exception)
      return { 
        success: false, 
        error: `Fallback exception: ${exception instanceof Error ? exception.message : String(exception)}` 
      }
    }
  }

  /**
   * Logs lifecycle events for observability
   */
  private async logLifecycleEvent(
    scanId: string,
    eventType: string,
    eventData: Record<string, any> = {}
  ): Promise<void> {
    try {
      await this.supabase
        .from('scan_lifecycle_events')
        .insert({
          scan_id: scanId,
          event_type: eventType,
          event_data: eventData
        })
    } catch (error) {
      // Don't fail the main operation if logging fails
      console.warn(`📊 [lifecycle] Failed to log event ${eventType} for scan ${scanId}:`, error)
    }
  }

  /**
   * Creates a new scan with initial heartbeat
   */
  async createScan(scanData: {
    site_id: string
    user_id: string
    status?: 'queued' | 'running'
    progress_message?: string
    heartbeat_interval_seconds?: number
    max_runtime_minutes?: number
    scan_profile?: 'quick' | 'standard' | 'deep'
  }): Promise<{ success: boolean; scanId?: string; error?: string }> {
    try {
      const now = new Date().toISOString()
      
      const capabilities = await getSchemaCapabilities()

      // Start with only guaranteed columns (those that exist in legacy schema)
      const scanPayload: any = {
        site_id: scanData.site_id,
        user_id: scanData.user_id,
        status: scanData.status || 'queued',
        created_at: now,
        updated_at: now
      }

      // Add scan profile if provided
      if (scanData.scan_profile) {
        scanPayload.scan_profile = scanData.scan_profile
      }

      // Add lifecycle columns ONLY if available
      if (capabilities.hasLastActivityAt) {
        scanPayload.last_activity_at = now
      }

      if (capabilities.hasProgressMessage && scanData.progress_message) {
        scanPayload.progress_message = scanData.progress_message
      }

      if (capabilities.hasHeartbeatIntervalSeconds) {
        scanPayload.heartbeat_interval_seconds = scanData.heartbeat_interval_seconds || 30
      }

      if (capabilities.hasMaxRuntimeMinutes) {
        scanPayload.max_runtime_minutes = scanData.max_runtime_minutes || 15
      }

      const { data, error } = await this.supabase
        .from('scans')
        .insert(scanPayload)
        .select()
        .single()

      if (error) {
        console.error('🔄 [lifecycle] Failed to create scan:', error)
        return { success: false, error: error.message }
      }

      const scanId = data.id
      console.log(`🔄 [lifecycle] ✅ Created scan ${scanId}`)

      // Log creation event
      await this.logLifecycleEvent(scanId, 'scan_started', {
        site_id: scanData.site_id,
        user_id: scanData.user_id,
        initial_status: scanData.status || 'queued'
      })

      // Analytics
      if (this.config.enableAnalytics) {
        scanAnalytics.started(scanId, scanData.site_id, scanData.user_id, {
          initial_status: scanData.status || 'queued'
        })
      }

      return { success: true, scanId }
    } catch (error) {
      console.error('🔄 [lifecycle] Exception creating scan:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  /**
   * Gets scan status with heartbeat information
   */
  async getScanStatus(scanId: string): Promise<{
    success: boolean
    scan?: any
    isStale?: boolean
    error?: string
  }> {
    try {
      const { data, error } = await this.supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Check if heartbeat is stale
      const now = new Date()
      const lastActivity = new Date(data.last_activity_at || data.created_at)
      const heartbeatInterval = (data.heartbeat_interval_seconds || 30) * 1000
      const staleThreshold = heartbeatInterval * 3 // 3x the expected interval

      const isStale = data.status === 'running' && 
        (now.getTime() - lastActivity.getTime()) > staleThreshold

      return { success: true, scan: data, isStale }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }
}

// Export singleton instance for convenience
export const scanLifecycleManager = new ScanLifecycleManager()

// Export class for custom configurations (already exported above)
// Note: Class is already exported in the class declaration

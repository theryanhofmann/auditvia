/**
 * Runtime schema capability detection for backward compatibility
 * 
 * Detects which database columns and RPC functions are available
 * to gracefully degrade functionality on legacy schemas.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'

interface SchemaCapabilities {
  // Scan table columns
  hasEndedAt: boolean
  hasLastActivityAt: boolean
  hasProgressMessage: boolean
  hasHeartbeatIntervalSeconds: boolean
  hasMaxRuntimeMinutes: boolean
  hasCleanupReason: boolean
  
  // RPC functions
  hasHeartbeatRpc: boolean
  hasTerminalTransitionRpc: boolean
  hasCleanupRpc: boolean
  
  // Detection metadata
  lastChecked: number
  isStale: boolean
}

class SchemaCapabilityDetector {
  private capabilities: SchemaCapabilities | null = null
  private readonly CACHE_TTL_MS = 60000 // 1 minute
  private readonly supabase: ReturnType<typeof createClient<Database>>
  
  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }

  /**
   * Get cached capabilities or detect fresh if stale
   */
  async getCapabilities(): Promise<SchemaCapabilities> {
    if (this.capabilities && !this.isCapabilitiesStale()) {
      return this.capabilities
    }

    try {
      console.log('🔍 [schema-detect] Running schema capability detection...')
      const detected = await this.detectCapabilities()
      
      this.capabilities = {
        ...detected,
        lastChecked: Date.now(),
        isStale: false
      }
      
      console.log('✅ [schema-detect] Schema capabilities detected:', {
        columns: {
          ended_at: detected.hasEndedAt,
          last_activity_at: detected.hasLastActivityAt,
          progress_message: detected.hasProgressMessage,
          heartbeat_interval_seconds: detected.hasHeartbeatIntervalSeconds,
          max_runtime_minutes: detected.hasMaxRuntimeMinutes,
          cleanup_reason: detected.hasCleanupReason
        },
        rpcs: {
          update_scan_heartbeat: detected.hasHeartbeatRpc,
          transition_scan_to_terminal: detected.hasTerminalTransitionRpc,
          cleanup_stuck_scans: detected.hasCleanupRpc
        }
      })
      
      return this.capabilities
    } catch (error) {
      console.warn('⚠️ [schema-detect] Detection failed, using safe defaults:', error)
      
      // Return safe defaults (assume legacy schema)
      this.capabilities = {
        hasEndedAt: false,
        hasLastActivityAt: false,
        hasProgressMessage: false,
        hasHeartbeatIntervalSeconds: false,
        hasMaxRuntimeMinutes: false,
        hasCleanupReason: false,
        hasHeartbeatRpc: false,
        hasTerminalTransitionRpc: false,
        hasCleanupRpc: false,
        lastChecked: Date.now(),
        isStale: false
      }
      
      return this.capabilities
    }
  }

  /**
   * Force refresh of capabilities (e.g., after migration)
   */
  async refresh(): Promise<SchemaCapabilities> {
    this.capabilities = null
    return this.getCapabilities()
  }

  private isCapabilitiesStale(): boolean {
    if (!this.capabilities) return true
    return Date.now() - this.capabilities.lastChecked > this.CACHE_TTL_MS
  }

  private async detectCapabilities(): Promise<Omit<SchemaCapabilities, 'lastChecked' | 'isStale'>> {
    const [columnCapabilities, rpcCapabilities] = await Promise.all([
      this.detectColumnCapabilities(),
      this.detectRpcCapabilities()
    ])

    return {
      ...columnCapabilities,
      ...rpcCapabilities
    }
  }

  private async detectColumnCapabilities(): Promise<{
    hasEndedAt: boolean
    hasLastActivityAt: boolean  
    hasProgressMessage: boolean
    hasHeartbeatIntervalSeconds: boolean
    hasMaxRuntimeMinutes: boolean
    hasCleanupReason: boolean
  }> {
    try {
      // Try to query with all new columns
      const { error } = await this.supabase
        .from('scans')
        .select('id, ended_at, last_activity_at, progress_message, heartbeat_interval_seconds, max_runtime_minutes, cleanup_reason')
        .limit(1)

      if (!error) {
        // All columns exist
        return {
          hasEndedAt: true,
          hasLastActivityAt: true,
          hasProgressMessage: true,
          hasHeartbeatIntervalSeconds: true,
          hasMaxRuntimeMinutes: true,
          hasCleanupReason: true
        }
      }

      // If error, test columns individually
      const results = await Promise.all([
        this.testColumn('ended_at'),
        this.testColumn('last_activity_at'),
        this.testColumn('progress_message'),
        this.testColumn('heartbeat_interval_seconds'),
        this.testColumn('max_runtime_minutes'),
        this.testColumn('cleanup_reason')
      ])

      return {
        hasEndedAt: results[0],
        hasLastActivityAt: results[1],
        hasProgressMessage: results[2],
        hasHeartbeatIntervalSeconds: results[3],
        hasMaxRuntimeMinutes: results[4],
        hasCleanupReason: results[5]
      }
    } catch (error) {
      console.warn('⚠️ [schema-detect] Column detection failed:', error)
      return {
        hasEndedAt: false,
        hasLastActivityAt: false,
        hasProgressMessage: false,
        hasHeartbeatIntervalSeconds: false,
        hasMaxRuntimeMinutes: false,
        hasCleanupReason: false
      }
    }
  }

  private async testColumn(columnName: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('scans')
        .select(`id, ${columnName}`)
        .limit(1)
      
      return !error
    } catch {
      return false
    }
  }

  private async detectRpcCapabilities(): Promise<{
    hasHeartbeatRpc: boolean
    hasTerminalTransitionRpc: boolean
    hasCleanupRpc: boolean
  }> {
    const results = await Promise.all([
      this.testRpc('update_scan_heartbeat'),
      this.testRpc('transition_scan_to_terminal'),
      this.testRpc('cleanup_stuck_scans_v2')
    ])

    return {
      hasHeartbeatRpc: results[0],
      hasTerminalTransitionRpc: results[1], 
      hasCleanupRpc: results[2]
    }
  }

  private async testRpc(rpcName: string): Promise<boolean> {
    try {
      // Try calling with invalid params to see if function exists
      // The function will error due to params, but PGRST202 means it doesn't exist
      const { error } = await this.supabase.rpc(rpcName as any, {} as any)
      
      // If we get PGRST202, the function doesn't exist
      if (error && error.code === 'PGRST202') {
        return false
      }
      
      // Any other error means the function exists but params were wrong
      return true
    } catch {
      return false
    }
  }
}

// Singleton instance
export const schemaCapabilities = new SchemaCapabilityDetector()

// Convenience functions
export async function getSchemaCapabilities(): Promise<SchemaCapabilities> {
  return schemaCapabilities.getCapabilities()
}

export async function refreshSchemaCapabilities(): Promise<SchemaCapabilities> {
  return schemaCapabilities.refresh()
}

export async function hasLifecycleFeatures(): Promise<boolean> {
  const caps = await getSchemaCapabilities()
  return caps.hasEndedAt && caps.hasLastActivityAt && caps.hasHeartbeatRpc
}

export async function hasBasicColumns(): Promise<boolean> {
  const caps = await getSchemaCapabilities()
  // These should always exist in any schema
  return true // id, site_id, user_id, status, created_at are guaranteed
}

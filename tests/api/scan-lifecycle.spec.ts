/**
 * Scan Lifecycle Tests
 * 
 * Tests the scan lifecycle management system including heartbeat monitoring,
 * schema cache recovery, and stuck scan cleanup.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ScanLifecycleManager } from '@/lib/scan-lifecycle-manager'
import { scanMaintenanceManager } from '@/lib/scan-maintenance'
import { refreshSchemaCache, isSchemaCacheError } from '@/lib/schema-cache-recovery'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({ data: { id: 'test-scan-id' }, error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: { id: 'test-scan-id', status: 'running' }, error: null }))
      }))
    }))
  })),
  rpc: vi.fn(() => ({ data: null, error: null }))
}

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    NODE_ENV: 'test'
  }
}))

// Mock Supabase client creation
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

describe('ScanLifecycleManager', () => {
  let lifecycleManager: ScanLifecycleManager

  beforeEach(() => {
    lifecycleManager = new ScanLifecycleManager({
      maxRetries: 2,
      baseDelayMs: 100,
      enableRecovery: true,
      enableAnalytics: false
    })
    vi.clearAllMocks()
  })

  describe('createScan', () => {
    it('should create a scan with initial heartbeat', async () => {
      const result = await lifecycleManager.createScan({
        site_id: 'test-site',
        user_id: 'test-user',
        status: 'running',
        progress_message: 'Starting scan...'
      })

      expect(result.success).toBe(true)
      expect(result.scanId).toBe('test-scan-id')
      expect(mockSupabase.from).toHaveBeenCalledWith('scans')
    })

    it('should handle creation errors gracefully', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: { message: 'Creation failed' } }))
          }))
        }))
      })

      const result = await lifecycleManager.createScan({
        site_id: 'test-site',
        user_id: 'test-user'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Creation failed')
    })
  })

  describe('updateHeartbeat', () => {
    it('should update scan heartbeat successfully', async () => {
      const result = await lifecycleManager.updateHeartbeat(
        'test-scan-id',
        'Processing...',
        'test-user'
      )

      expect(result.success).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_scan_heartbeat', {
        scan_id: 'test-scan-id',
        progress_msg: 'Processing...'
      })
    })

    it('should handle heartbeat update errors', async () => {
      mockSupabase.rpc.mockReturnValueOnce({
        error: { message: 'Heartbeat failed' }
      })

      const result = await lifecycleManager.updateHeartbeat('test-scan-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Heartbeat failed')
    })
  })

  describe('transitionToTerminal', () => {
    it('should transition scan to completed state', async () => {
      const result = await lifecycleManager.transitionToTerminal('test-scan-id', 'completed', {
        userId: 'test-user',
        results: { violations: 5, passes: 20 }
      })

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('scans')
    })

    it('should transition scan to failed state with error message', async () => {
      const result = await lifecycleManager.transitionToTerminal('test-scan-id', 'failed', {
        errorMessage: 'Scan timeout',
        userId: 'test-user'
      })

      expect(result.success).toBe(true)
    })
  })

  describe('updateWithRecovery', () => {
    it('should update scan successfully on first attempt', async () => {
      const result = await lifecycleManager.updateWithRecovery('test-scan-id', {
        status: 'completed',
        ended_at: new Date().toISOString()
      })

      expect(result.success).toBe(true)
    })

    it('should retry on schema cache errors', async () => {
      // First call fails with schema cache error, second succeeds
      mockSupabase.from
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: { code: 'PGRST204', message: 'Schema cache miss' } }))
          }))
        })
        .mockReturnValueOnce({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null }))
          }))
        })

      const result = await lifecycleManager.updateWithRecovery('test-scan-id', {
        status: 'completed'
      })

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledTimes(2)
    })
  })

  describe('getScanStatus', () => {
    it('should get scan status with staleness check', async () => {
      const now = new Date()
      const recentActivity = new Date(now.getTime() - 30000) // 30 seconds ago
      
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'test-scan-id',
                status: 'running',
                last_activity_at: recentActivity.toISOString(),
                heartbeat_interval_seconds: 30
              },
              error: null
            }))
          }))
        }))
      })

      const result = await lifecycleManager.getScanStatus('test-scan-id')

      expect(result.success).toBe(true)
      expect(result.scan).toBeDefined()
      expect(result.isStale).toBe(false)
    })

    it('should detect stale heartbeat', async () => {
      const now = new Date()
      const staleActivity = new Date(now.getTime() - 200000) // 200 seconds ago
      
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'test-scan-id',
                status: 'running',
                last_activity_at: staleActivity.toISOString(),
                heartbeat_interval_seconds: 30
              },
              error: null
            }))
          }))
        }))
      })

      const result = await lifecycleManager.getScanStatus('test-scan-id')

      expect(result.success).toBe(true)
      expect(result.isStale).toBe(true)
    })
  })
})

describe('Schema Cache Recovery', () => {
  describe('isSchemaCacheError', () => {
    it('should detect PGRST204 errors', () => {
      const error = { code: 'PGRST204', message: 'Schema cache miss' }
      expect(isSchemaCacheError(error)).toBe(true)
    })

    it('should detect column not found errors', () => {
      const error = { message: 'column "ended_at" does not exist in the schema cache' }
      expect(isSchemaCacheError(error)).toBe(true)
    })

    it('should not detect unrelated errors', () => {
      const error = { code: '23505', message: 'duplicate key value' }
      expect(isSchemaCacheError(error)).toBe(false)
    })
  })

  describe('refreshSchemaCache', () => {
    beforeEach(() => {
      global.fetch = vi.fn()
    })

    it('should attempt schema refresh for Supabase hosted', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200
      })

      const result = await refreshSchemaCache()

      expect(result.success).toBe(true)
      expect(result.method).toBe('postgrest_admin')
    })

    it('should handle refresh failures gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

      const result = await refreshSchemaCache()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })
})

describe('Scan Maintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cleanupStuckScans', () => {
    it('should identify stuck scans in dry run mode', async () => {
      mockSupabase.rpc.mockReturnValueOnce({
        data: [
          {
            scan_id: 'stuck-scan-1',
            reason: 'runtime_timeout',
            age_minutes: 20,
            heartbeat_age_minutes: 15
          }
        ],
        error: null
      })

      const result = await scanMaintenanceManager.cleanupStuckScans(
        { maxRuntimeMinutes: 15, heartbeatStaleMinutes: 5 },
        true
      )

      expect(result.cleanedCount).toBe(1)
      expect(result.scansProcessed).toHaveLength(1)
      expect(result.scansProcessed[0].reason).toBe('runtime_timeout')
    })

    it('should handle cleanup RPC errors', async () => {
      mockSupabase.rpc.mockReturnValueOnce({
        data: null,
        error: { message: 'RPC failed' }
      })

      const result = await scanMaintenanceManager.cleanupStuckScans()

      expect(result.cleanedCount).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toContain('RPC failed')
    })
  })

  describe('getScanHealthMetrics', () => {
    it('should calculate health metrics correctly', async () => {
      const now = new Date()
      const recentScan = new Date(now.getTime() - 30000) // 30 seconds ago
      const staleScan = new Date(now.getTime() - 600000) // 10 minutes ago

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          gte: vi.fn(() => ({
            data: [
              {
                status: 'running',
                created_at: recentScan.toISOString(),
                last_activity_at: recentScan.toISOString()
              },
              {
                status: 'running',
                created_at: staleScan.toISOString(),
                last_activity_at: staleScan.toISOString()
              },
              {
                status: 'completed',
                created_at: recentScan.toISOString(),
                last_activity_at: recentScan.toISOString()
              }
            ],
            error: null
          }))
        }))
      })

      const metrics = await scanMaintenanceManager.getScanHealthMetrics()

      expect(metrics.totalScans).toBe(3)
      expect(metrics.runningScans).toBe(2)
      expect(metrics.staleScans).toBeGreaterThan(0)
      expect(metrics.healthScore).toBeLessThan(100)
    })
  })

  describe('validateScanHealth', () => {
    it('should validate healthy scan', async () => {
      const now = new Date()
      const recentActivity = new Date(now.getTime() - 30000)

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'test-scan',
                status: 'running',
                created_at: recentActivity.toISOString(),
                last_activity_at: recentActivity.toISOString(),
                max_runtime_minutes: 15,
                heartbeat_interval_seconds: 30
              },
              error: null
            }))
          }))
        }))
      })

      const result = await scanMaintenanceManager.validateScanHealth('test-scan')

      expect(result.healthy).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    it('should detect runtime timeout', async () => {
      const now = new Date()
      const oldScan = new Date(now.getTime() - 1200000) // 20 minutes ago

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => ({
              data: {
                id: 'test-scan',
                status: 'running',
                created_at: oldScan.toISOString(),
                last_activity_at: oldScan.toISOString(),
                max_runtime_minutes: 15,
                heartbeat_interval_seconds: 30
              },
              error: null
            }))
          }))
        }))
      })

      const result = await scanMaintenanceManager.validateScanHealth('test-scan')

      expect(result.healthy).toBe(false)
      expect(result.issues.some(issue => issue.includes('Runtime exceeded'))).toBe(true)
    })
  })

  describe('markScanAsFailed', () => {
    it('should mark scan as failed successfully', async () => {
      mockSupabase.rpc.mockReturnValueOnce({
        error: null
      })

      const result = await scanMaintenanceManager.markScanAsFailed(
        'test-scan',
        'Manual intervention',
        'test-user'
      )

      expect(result.success).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('transition_scan_to_terminal', {
        scan_id: 'test-scan',
        new_status: 'failed',
        end_time: expect.any(String),
        error_msg: 'Manual intervention',
        final_progress_msg: 'Scan manually marked as failed'
      })
    })
  })
})

describe('Integration Tests', () => {
  it('should handle complete scan lifecycle', async () => {
    const manager = new ScanLifecycleManager({ enableAnalytics: false })

    // Create scan
    const createResult = await manager.createScan({
      site_id: 'test-site',
      user_id: 'test-user',
      status: 'running'
    })
    expect(createResult.success).toBe(true)

    const scanId = createResult.scanId!

    // Update heartbeat
    const heartbeatResult = await manager.updateHeartbeat(scanId, 'Processing...', 'test-user')
    expect(heartbeatResult.success).toBe(true)

    // Transition to completed
    const terminalResult = await manager.transitionToTerminal(scanId, 'completed', {
      userId: 'test-user',
      results: { violations: 3, passes: 15 }
    })
    expect(terminalResult.success).toBe(true)
  })

  it('should handle scan failure with recovery', async () => {
    const manager = new ScanLifecycleManager({ enableAnalytics: false })

    // Simulate schema cache error followed by success
    mockSupabase.from
      .mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'test-scan' }, error: null }))
          }))
        }))
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: { code: 'PGRST204' } }))
        }))
      })
      .mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null }))
        }))
      })

    const createResult = await manager.createScan({
      site_id: 'test-site',
      user_id: 'test-user'
    })
    expect(createResult.success).toBe(true)

    const terminalResult = await manager.transitionToTerminal(createResult.scanId!, 'failed', {
      errorMessage: 'Test error',
      userId: 'test-user'
    })
    expect(terminalResult.success).toBe(true)
    expect(terminalResult.recoveryAttempts).toBeDefined()
  })
})

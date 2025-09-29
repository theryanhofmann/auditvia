import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { AccessibilityScanner } from '../../../../scripts/runA11yScan'
import type { Result } from 'axe-core'
import { sendScanCompletionEmail } from '@/app/lib/email/sendScanCompletionEmail'
import type { Issue } from '@/app/types/email'
import { auth } from '@/auth'
import { verifySiteOwnership } from '@/app/lib/ownership'
import { ensurePlaywrightReady } from '@/lib/playwright-preflight'
import { scanAnalytics } from '@/lib/safe-analytics'
import { scanLifecycleManager } from '@/lib/scan-lifecycle-manager'

// Force Node.js runtime for NextAuth and heavy scan operations
export const runtime = 'nodejs'

interface AuditRequest {
  url: string
  siteId: string
  userId?: string
  waitForSelector?: string
}

interface ScanResponse {
  success: boolean
  scanId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  data?: {
    scan: {
      id: string
      status: string
      total_violations: number
      passes: number
      incomplete: number
      inapplicable: number
      scan_time_ms: number
      site_id: string
      score?: number
    }
  }
  summary?: {
    violations: number
    passes: number
    incomplete: number
    inapplicable: number
    scan_time_ms: number
    score?: number
    by_impact?: Record<string, number>
  }
  error?: {
    code: string
    message: string
  }
}

export async function POST(request: Request): Promise<NextResponse<ScanResponse>> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false
      }
    }
  )

  try {
    console.log('🚀 Starting audit request...')
    
    // Parse request body
    const { url, siteId, userId, waitForSelector } = await request.json() as AuditRequest

    // Validate required fields
    if (!url || !siteId) {
      console.error('❌ Missing required fields')
      return NextResponse.json({
        success: false,
        scanId: '',
        status: 'failed',
        error: {
          code: 'validation_error',
          message: 'Missing required fields: url and siteId'
        }
      } as ScanResponse, { status: 400 })
    }

    // Validate team ownership using current session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        scanId: '',
        status: 'failed',
        error: {
          code: 'authentication_error',
          message: 'Authentication required'
        }
      } as ScanResponse, { status: 401 })
    }

    // Simple rate limiting: check for recent scans by this user
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentScans } = await supabase
      .from('scans')
      .select('id')
      .eq('user_id', session.user.id)
      .gte('created_at', fiveMinutesAgo)
      .limit(10)

    if (recentScans && recentScans.length >= 5) {
      console.warn(`🚦 [rate-limit] User ${session.user.id} has ${recentScans.length} scans in last 5 minutes`)
      return NextResponse.json({
        success: false,
        error: {
          code: 'rate_limit',
          message: 'Rate limit exceeded. Please wait before starting another scan.'
        },
        scanId: '',
        status: 'failed'
      } as ScanResponse, { status: 429 })
    }

    // Verify site ownership using centralized helper
    const ownershipResult = await verifySiteOwnership(session.user.id, siteId, '🔒 [audit]')
    
    if (!ownershipResult.allowed) {
      const { error } = ownershipResult
      return NextResponse.json({
        success: false,
        scanId: '',
        status: 'failed',
        error: {
          code: error!.code === 'site_not_found' ? 'not_found' : 'authorization_error',
          message: error!.message
        }
      } as ScanResponse, { status: error!.httpStatus })
    }

    const { role, site } = ownershipResult
    console.log(`🔒 [audit] ✅ Site ownership verified - user has role: ${role}`)

    // Playwright preflight check - fail fast if browsers not available
    console.log('🎭 [audit] Running Playwright preflight check...')
    const playwrightCheck = await ensurePlaywrightReady()
    
    if (!playwrightCheck.ready) {
      console.error('🎭 [audit] ❌ Playwright preflight failed:', playwrightCheck.error)
      
      // Create a failed scan record immediately (don't leave it running)
      const { data: failedScan } = await supabase
        .from('scans')
        .insert([{
          site_id: siteId as string,
          user_id: session.user.id,
          status: 'failed',
          error_message: playwrightCheck.error || 'Playwright not available',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      // Safe analytics logging
      scanAnalytics.failed(
        failedScan?.id || 'unknown',
        siteId,
        session.user.id,
        playwrightCheck.error || 'Playwright not available',
        { reason: 'playwright_missing' }
      )

      return NextResponse.json({
        success: false,
        scanId: failedScan?.id || '',
        status: 'failed',
        error: {
          code: 'playwright_missing',
          message: playwrightCheck.error || 'Browser not available for scanning'
        }
      } as ScanResponse, { status: 503 })
    }
    console.log('🎭 [audit] ✅ Playwright preflight passed')

    // Create scan record using lifecycle manager
    console.log('📝 Creating scan record with lifecycle manager...')
    const scanCreationResult = await scanLifecycleManager.createScan({
      site_id: siteId as string,
      user_id: session.user.id,
      status: 'running',
      progress_message: 'Scan queued for execution'
    })

    if (!scanCreationResult.success || !scanCreationResult.scanId) {
      console.error('❌ Failed to create scan record:', scanCreationResult.error)
      return NextResponse.json({
        success: false,
        scanId: '',
        status: 'failed',
        error: {
          code: 'database_error',
          message: scanCreationResult.error || 'Failed to create scan record'
        }
      } as ScanResponse, { status: 500 })
    }
    
    const scanId = scanCreationResult.scanId
    console.log('✅ Scan record created:', scanId)

    // Return scanId immediately and run the scan asynchronously
    const scanMetadata = {
      scanId,
      siteId,
      userId: session.user.id,
      targetUrl: url,
      timestamp: new Date().toISOString(),
      auditDevMode: process.env.AUDIT_DEV_MODE === 'true'
    }
    
    console.log(`🧵 [job] started - scanId: ${scanId}, siteId: ${siteId}`)
    
    // Fire and forget the async scan job
    runScanJob(scanId, url, siteId, session.user.id, waitForSelector).catch(error => {
      console.error(`🧵 [job] failed - scanId: ${scanId}:`, error)
    })

    return NextResponse.json({
      success: true,
      scanId,
      status: 'running'
    } as ScanResponse, { status: 201 })

  } catch (error) {
    console.error('❌ Audit error:', error)
    return NextResponse.json({
      success: false,
      scanId: '',
      status: 'failed',
      error: {
        code: 'internal_error',
        message: error instanceof Error ? error.message : 'Failed to run accessibility audit'
      }
    } as ScanResponse, { status: 500 })
  }
}

// Async scan job runner (decoupled from main API flow)
async function runScanJob(
  scanId: string,
  url: string,
  siteId: string,
  userId: string,
  waitForSelector?: string
): Promise<void> {
  const startTime = Date.now()
  const SCAN_TIMEOUT_MS = 120000 // 2 minutes max per scan
  
  // Set up timeout guard
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Scan timeout after ${SCAN_TIMEOUT_MS / 1000}s`))
    }, SCAN_TIMEOUT_MS)
  })
  
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false
      }
    }
  )

  try {
    console.log(`🧵 [job] Running scan job - scanId: ${scanId}, url: ${url}`)
    
    // Update heartbeat - scan is starting
    await scanLifecycleManager.updateHeartbeat(scanId, 'Initializing scan...', userId)

    // Determine if we should use dev fallback based on AUDIT_DEV_MODE
    const auditDevMode = process.env.AUDIT_DEV_MODE === 'true'
    const useRealScan = !auditDevMode

    let results: any
    
    // Race the scan against the timeout
    const scanPromise = (async () => {
      if (useRealScan) {
        // Run the real accessibility scan
        console.log(`🧵 [job] Running real accessibility scan - scanId: ${scanId}`)
        await scanLifecycleManager.updateHeartbeat(scanId, 'Launching browser...', userId)
        
        const scanner = new AccessibilityScanner()
        
        await scanLifecycleManager.updateHeartbeat(scanId, `Navigating to ${url}...`, userId)
        
        const result = await scanner.scan({
          url,
          waitForSelector,
          viewport: { width: 1280, height: 720 },
          timeout: 30000
        })
        
        await scanLifecycleManager.updateHeartbeat(scanId, 'Analyzing accessibility rules...', userId)
        console.log(`🧵 [job] Real scan completed - scanId: ${scanId}`)
        return result
      } else {
        // Use dev fallback with stub data
        console.log(`🧵 [job] Using dev fallback scan - scanId: ${scanId}`)
        console.log('🎭 AUDIT_DEV_MODE active - using mock data for demo purposes')
        
        await scanLifecycleManager.updateHeartbeat(scanId, 'Generating mock data...', userId)
        
        const mockViolations = Math.floor(Math.random() * 8) + 2 // 2-9 violations
        const mockPasses = Math.floor(Math.random() * 50) + 25 // 25-74 passes
        const mockIncomplete = Math.floor(Math.random() * 5) // 0-4 incomplete
        const mockInapplicable = Math.floor(Math.random() * 10) + 5 // 5-14 inapplicable
      
        return {
          violations: Array.from({ length: mockViolations }, (_, i) => ({
            id: `stub-rule-${i + 1}`,
            impact: ['critical', 'serious', 'moderate', 'minor'][Math.floor(Math.random() * 4)],
            nodes: [{
              target: [`body > main > div:nth-child(${i + 1})`],
              html: `<div>Mock violation ${i + 1}</div>`,
              failureSummary: `Mock failure summary for violation ${i + 1}`
            }],
            description: `Mock accessibility violation ${i + 1}`,
            help: `Fix this mock violation ${i + 1}`,
            helpUrl: `https://dequeuniversity.com/rules/axe/4.6/stub-rule-${i + 1}`,
            tags: ['wcag2aa', `wcag${121 + i}`]
          })),
          passes: mockPasses,
          incomplete: mockIncomplete,
          inapplicable: mockInapplicable,
          timeToScan: 1500 + Math.floor(Math.random() * 2000) // 1.5-3.5s
        }
      }
    })()
    
    results = await Promise.race([scanPromise, timeoutPromise])
    console.log(`🧵 [job] Scan completed - scanId: ${scanId}`)

    // Update heartbeat - processing results
    await scanLifecycleManager.updateHeartbeat(scanId, 'Processing scan results...', userId)

    // Store violations in the issues table (best effort)
    if (results.violations.length > 0) {
      console.log(`🧵 [job] Storing ${results.violations.length} violations - scanId: ${scanId}`)
      await scanLifecycleManager.updateHeartbeat(scanId, `Storing ${results.violations.length} violations...`, userId)
      
      try {
        const issuePromises = results.violations.map(async (violation: any) => {
          // Get WCAG rule from tags
          const wcagTag = violation.tags?.find((tag: string) => tag.startsWith('wcag'))
          const wcagRule = wcagTag ? `WCAG ${wcagTag.slice(4, -1)}.${wcagTag.slice(-1).toUpperCase()}` : null

          // Process each node in the violation
          return Promise.all((violation.nodes || []).map((node: any) => 
            supabase
              .from('issues')
              .insert([{
                scan_id: scanId,
                rule: violation.id,
                selector: Array.isArray(node.target) ? node.target.join(', ') : String(node.target),
                severity: violation.impact || 'minor',
                impact: violation.impact,
                description: violation.description,
                help_url: violation.helpUrl,
                html: node.html,
                failure_summary: node.failureSummary,
                wcag_rule: wcagRule
              }])
          ))
        })

        await Promise.all(issuePromises.flat())
        console.log(`🧵 [job] Violations stored - scanId: ${scanId}`)
      } catch (error) {
        console.error(`🧵 [job] Error storing violations - scanId: ${scanId}:`, error)
        // Continue execution - we don't want to fail the whole scan if issue storage fails
      }
    } else {
      console.log(`🧵 [job] No violations found - scanId: ${scanId}`)
    }

    // Update scan record with results using lifecycle manager
    console.log(`🧵 [job] Updating scan record - scanId: ${scanId}`)
    await scanLifecycleManager.updateHeartbeat(scanId, 'Finalizing scan results...', userId)
    
    // First update the scan with results data
    await updateScanRecordWithRetry(supabase, scanId, {
      total_violations: results.violations.length,
      passes: results.passes,
      incomplete: results.incomplete,
      inapplicable: results.inapplicable,
      scan_time_ms: results.timeToScan,
      updated_at: new Date().toISOString()
    })
    
    // Then transition to completed state
    const transitionResult = await scanLifecycleManager.transitionToTerminal(scanId, 'completed', {
      progressMessage: 'Scan completed successfully',
      userId,
      results: {
        violations: results.violations.length,
        passes: results.passes,
        incomplete: results.incomplete,
        inapplicable: results.inapplicable,
        scan_time_ms: results.timeToScan
      }
    })
    
    if (!transitionResult.success) {
      console.error(`🧵 [job] ⚠️ Failed to transition scan to completed state: ${transitionResult.error}`)
      // Continue execution - the scan data is stored, just the state transition failed
    } else {
      console.log(`🧵 [job] ✅ Scan record updated successfully - scanId: ${scanId}`)
    }

    // Calculate accessibility score treating inapplicable as passes
    const totalTests = results.passes + results.violations.length + results.incomplete + results.inapplicable
    const successfulTests = results.passes + results.inapplicable
    const score = totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : null

    // Send completion email (best effort - never fail the request)
    sendCompletionEmailAsync(supabase, userId, siteId, { id: scanId }, score, results)
      .catch(error => console.error(`🧵 [job] Background email sending failed - scanId: ${scanId}:`, error))

    const duration = Date.now() - startTime
    
    // Structured logging for scan completion
    const completionMetadata = {
      scanId,
      siteId,
      userId,
      duration,
      score: totalTests > 0 ? Math.round(((results.passes + results.inapplicable) / totalTests) * 100) : null,
      totalViolations: results.violations.length,
      passes: results.passes,
      incomplete: results.incomplete,
      inapplicable: results.inapplicable,
      totalTests,
      timestamp: new Date().toISOString()
    }

    console.log(`🧵 [job] completed - scanId: ${scanId}, duration: ${duration}ms`)
    
    // Safe analytics logging
    scanAnalytics.completed(scanId, siteId, userId, completionMetadata)

  } catch (error) {
    const duration = Date.now() - startTime
    
    // Structured logging for scan failure
    const failureMetadata = {
      scanId,
      siteId,
      userId,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
    
    console.error(`🧵 [job] failed - scanId: ${scanId}, duration: ${duration}ms:`, error)
    
    // Safe analytics logging
    scanAnalytics.failed(scanId, siteId, userId, failureMetadata.error, failureMetadata)
    
    // Use lifecycle manager to transition to failed state
    const errorMessage = error instanceof Error ? error.message : 'Unknown scan error'
    const transitionResult = await scanLifecycleManager.transitionToTerminal(scanId, 'failed', {
      errorMessage,
      progressMessage: 'Scan failed',
      userId
    })
    
    if (!transitionResult.success) {
      console.error(`🧵 [job] ❌ Failed to transition scan to failed state - scanId: ${scanId}:`, transitionResult.error)
      
      // Fallback: try direct database update
      try {
        await updateScanRecordWithRetry(supabase, scanId, {
          status: 'failed',
          finished_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          total_violations: 0,
          passes: 0,
          incomplete: 0,
          inapplicable: 0,
          scan_time_ms: duration,
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        console.log(`🧵 [job] ✅ Failed scan record updated via fallback - scanId: ${scanId}`)
      } catch (updateError) {
        console.error(`🧵 [job] ❌ Even fallback update failed - scanId: ${scanId}:`, updateError)
      }
    } else {
      console.log(`🧵 [job] ✅ Scan marked as failed - scanId: ${scanId}`)
    }
  }
}

/**
 * Update scan record with retry logic to handle schema cache issues (PGRST204)
 * Retries once after a short delay if the first update fails
 */
async function updateScanRecordWithRetry(
  supabase: any,
  scanId: string,
  updateData: Record<string, any>,
  maxRetries = 1
): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { error: updateError } = await supabase
        .from('scans')
        .update(updateData)
        .eq('id', scanId)

      if (updateError) {
        // Check for schema cache issues (PGRST204)
        if (updateError.code === 'PGRST204' && attempt < maxRetries) {
          console.warn(`🧵 [job] Schema cache issue on attempt ${attempt + 1}, retrying in 1s...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        }
        throw new Error(`Database update failed: ${updateError.message} (code: ${updateError.code})`)
      }
      
      // Success - break out of retry loop
      return
      
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error
      }
      console.warn(`🧵 [job] Update attempt ${attempt + 1} failed, retrying:`, error)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

// Background email sending function (decoupled from main flow)
async function sendCompletionEmailAsync(
  supabase: any,
  userId: string,
  siteId: string,
  scan: any,
  score: number | null,
  results: any
): Promise<void> {
  try {
    console.log('📧 Attempting to send completion email...')
    
    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('id, email, name, pro')
      .eq('id', userId)
      .single()

    // Only send email to pro users with email addresses
    if (!user?.pro || !user.email) {
      console.log('📧 Email skipped - not a pro user or no email address')
      return
    }

    // Get site data
    const { data: site } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (!site) {
      console.log('📧 Email skipped - site not found')
      return
    }

    // Get violations
    const { data: violations } = await supabase
      .from('issues')
      .select('*')
      .eq('scan_id', scan.id)
      .order('severity', { ascending: false })

    await sendScanCompletionEmail({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        pro: user.pro,
      },
      site,
      scan: {
        ...scan,
        score: score || 0,
      },
      violations: violations?.map((v: any) => ({
        ...v,
        message: v.description || v.failure_summary || 'Unknown issue',
      })) as Issue[] || [],
    })
    
    console.log('✅ Completion email sent successfully')
  } catch (error) {
    console.error('⚠️ Email sending failed:', error)
    // Don't throw - this is background processing
  }
} 
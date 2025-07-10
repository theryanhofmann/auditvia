/**
 * Auditvia Automated Monitoring Script
 * 
 * This script scans all sites with monitoring enabled and updates their accessibility scores.
 * It runs each scan independently so failures don't affect other sites.
 * 
 * To run manually:
 * 1. Ensure environment variables are set:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 * 
 * 2. Run the script:
 *    ```bash
 *    pnpm ts-node scripts/monitoring.ts [--cron]
 *    ```
 * 
 * The script will:
 * 1. Fetch all sites with monitoring_enabled = true
 * 2. Run accessibility scans for each site
 * 3. Save results and calculate trends
 * 4. Log a detailed summary
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/app/types/database'
import type { 
  Site, 
  ScanInsert, 
  IssueInsert,
  SeverityLevel 
} from '../src/app/types/database'
import { runA11yScan } from './runA11yScan'
import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { format } from 'date-fns'
import type { ImpactValue } from 'axe-core'

// Maximum retries per site scan
const MAX_RETRIES = 2
// Delay between retries (in ms)
const RETRY_DELAY = 5000
// Delay between sites (in ms)
const SITE_DELAY = 2000

// Parse command line arguments
const isCronMode = process.argv.includes('--cron')
const logDir = join(process.cwd(), 'logs')
const errorLogFile = join(logDir, 'monitoring-errors.log')

// Ensure log directory exists
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true })
}

// Validate environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const error = 'Missing NEXT_PUBLIC_SUPABASE_URL environment variable'
  logError(error)
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const error = 'Missing SUPABASE_SERVICE_ROLE_KEY environment variable'
  logError(error)
  process.exit(1)
}

interface ScanIssue {
  rule: string
  impact: ImpactValue
  description: string
  helpUrl: string
  selector: string
  html: string
}

interface ScanResult {
  id: string
  score: number
  issues: ScanIssue[]
  trends?: {
    changeInScore: number
    newIssuesCount: number
    resolvedIssuesCount: number
    criticalIssuesDelta: number
    seriousIssuesDelta: number
    moderateIssuesDelta: number
    minorIssuesDelta: number
  }
}

interface MonitoringSummary {
  totalSites: number
  successfulScans: number
  failedScans: number
  totalIssuesFound: number
  averageScore: number
  totalNewIssues: number
  totalResolvedIssues: number
  criticalIssuesDelta: number
  seriousIssuesDelta: number
  moderateIssuesDelta: number
  minorIssuesDelta: number
  siteResults: Array<{
    name: string
    url: string
    status: 'success' | 'failure'
    score?: number
    issuesCount?: number
    error?: string
    retries?: number
  }>
}

// Helper function to get a unique key for issue comparison
function getIssueKey(issue: Pick<ScanIssue, 'rule' | 'selector' | 'html'>): string {
  // Normalize HTML by removing whitespace and normalizing quotes
  const normalizedHtml = issue.html
    ?.replace(/\s+/g, ' ')
    .replace(/["']/g, '"')
    .trim() || ''

  // Normalize selector by removing extra whitespace
  const normalizedSelector = issue.selector?.replace(/\s+/g, ' ').trim() || ''

  return `${issue.rule}:${normalizedSelector}:${normalizedHtml}`
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to log errors
function logError(error: string | Error, context?: Record<string, any>) {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss')
  const errorMessage = error instanceof Error ? error.message : error
  const contextStr = context ? ` Context: ${JSON.stringify(context)}` : ''
  const logMessage = `[${timestamp}] ERROR: ${errorMessage}${contextStr}\n`

  // Always log to error file
  appendFileSync(errorLogFile, logMessage)

  // Log to console if not in cron mode
  if (!isCronMode) {
    console.error(logMessage)
  }
}

// Helper function for development logging
function devLog(message: string, data?: Record<string, any>) {
  if (!isCronMode) {
    console.log(message, data ? data : '')
  }
}

// Add type guard for severity levels
function isSeverityLevel(value: string | null): value is SeverityLevel {
  return value === 'minor' || value === 'moderate' || value === 'serious' || value === 'critical'
}

// Add helper to convert impact to severity
function impactToSeverity(impact: ImpactValue | null): SeverityLevel {
  if (impact === null) return 'minor'
  if (isSeverityLevel(impact)) return impact
  return 'minor' // Default to minor for unknown impacts
}

async function calculateScanTrends(
  supabase: ReturnType<typeof createClient<Database>>,
  currentScan: ScanResult,
  site_id: string
): Promise<NonNullable<ScanResult['trends']>> {
  // Get the previous completed scan for this site
  const { data: previousScans, error: scanError } = await supabase
    .from('scans')
    .select(`
      id,
      score,
      issues (
        id,
        rule,
        selector,
        html,
        severity,
        impact,
        description,
        help_url
      )
    `)
    .eq('site_id', site_id)
    .eq('status', 'completed')
    .neq('id', currentScan.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (scanError) {
    logError('Error fetching previous scan:', { error: scanError, site_id })
    throw new Error(`Failed to fetch previous scan: ${scanError.message}`)
  }

  // If no previous scan, all issues are new
  if (!previousScans || previousScans.length === 0 || !previousScans[0].score) {
    return {
      changeInScore: currentScan.score,
      newIssuesCount: currentScan.issues.length,
      resolvedIssuesCount: 0,
      criticalIssuesDelta: currentScan.issues.filter(i => i.impact === 'critical').length,
      seriousIssuesDelta: currentScan.issues.filter(i => i.impact === 'serious').length,
      moderateIssuesDelta: currentScan.issues.filter(i => i.impact === 'moderate').length,
      minorIssuesDelta: currentScan.issues.filter(i => i.impact === 'minor').length
    }
  }

  const previousScan = previousScans[0]

  // Map previous scan issues to the correct format
  const previousIssues = previousScan.issues.map(issue => ({
    rule: issue.rule,
    impact: (issue.impact || issue.severity) as ImpactValue,
    description: issue.description || '',
    helpUrl: issue.help_url || '',
    selector: issue.selector,
    html: issue.html || ''
  }))

  // Create sets of issue keys for comparison
  const currentIssueKeys = new Set(currentScan.issues.map(getIssueKey))
  const previousIssueKeys = new Set(previousIssues.map(getIssueKey))

  // Count new and resolved issues
  const newIssues = currentScan.issues.filter(issue => !previousIssueKeys.has(getIssueKey(issue)))
  const resolvedIssues = previousIssues.filter(issue => !currentIssueKeys.has(getIssueKey(issue)))

  // Calculate severity deltas
  const countBySeverity = (issues: ScanIssue[], severity: ImpactValue) =>
    issues.filter(i => i.impact === severity).length

  const criticalDelta = countBySeverity(newIssues, 'critical') - countBySeverity(resolvedIssues, 'critical')
  const seriousDelta = countBySeverity(newIssues, 'serious') - countBySeverity(resolvedIssues, 'serious')
  const moderateDelta = countBySeverity(newIssues, 'moderate') - countBySeverity(resolvedIssues, 'moderate')
  const minorDelta = countBySeverity(newIssues, 'minor') - countBySeverity(resolvedIssues, 'minor')

  return {
    changeInScore: currentScan.score - (previousScan.score || 0),
    newIssuesCount: newIssues.length,
    resolvedIssuesCount: resolvedIssues.length,
    criticalIssuesDelta: criticalDelta,
    seriousIssuesDelta: seriousDelta,
    moderateIssuesDelta: moderateDelta,
    minorIssuesDelta: minorDelta
  }
}

async function scanSite(
  supabase: ReturnType<typeof createClient<Database>>,
  site: Site,
  retryCount = 0
): Promise<ScanResult> {
  devLog(`\n🔍 Starting scan for ${site.name || site.url} (attempt ${retryCount + 1})`)

  // Create initial scan record
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .insert({
      site_id: site.id,
      status: 'running',
      started_at: new Date().toISOString()
    } satisfies ScanInsert)
    .select()
    .single()

  if (scanError || !scan) {
    throw new Error(`Failed to create scan record: ${scanError?.message}`)
  }

  try {
    // Run the accessibility scan
    devLog(`📊 Running scan for ${site.url}...`)
    const scanResult = await runA11yScan(site.url)
    devLog(`✅ Scan completed with score: ${scanResult.score}/100`)

    // Map scan issues to database format with proper type conversion
    const issues: IssueInsert[] = scanResult.issues.map(issue => {
      const severity = impactToSeverity(issue.impact)
      return {
        scan_id: scan.id,
        rule: issue.rule,
        selector: issue.selector,
        severity,
        impact: severity, // Use converted severity for impact
        description: issue.description,
        help_url: issue.helpUrl,
        html: issue.html
      }
    })

    // Insert issues
    if (issues.length > 0) {
      devLog(`💾 Saving ${issues.length} issues...`)
      const { error: issuesError } = await supabase
        .from('issues')
        .insert(issues)

      if (issuesError) {
        throw new Error(`Failed to insert issues: ${issuesError.message}`)
      }
    }

    // Update scan record with results
    const { error: updateError } = await supabase
      .from('scans')
      .update({
        status: 'completed',
        score: scanResult.score,
        finished_at: new Date().toISOString()
      } satisfies Partial<ScanInsert>)
      .eq('id', scan.id)

    if (updateError) {
      throw new Error(`Failed to update scan record: ${updateError.message}`)
    }

    // Calculate and save trends
    const trends = await calculateScanTrends(supabase, { 
      id: scan.id, 
      score: scanResult.score, 
      issues: scanResult.issues
    }, site.id)

    // Save trends
    const { error: trendsError } = await supabase
      .from('scan_trends')
      .insert({
        scan_id: scan.id,
        site_id: site.id,
        score_change: trends.changeInScore,
        new_issues_count: trends.newIssuesCount,
        resolved_issues_count: trends.resolvedIssuesCount,
        critical_issues_delta: trends.criticalIssuesDelta,
        serious_issues_delta: trends.seriousIssuesDelta,
        moderate_issues_delta: trends.moderateIssuesDelta,
        minor_issues_delta: trends.minorIssuesDelta
      })

    if (trendsError) {
      logError('Failed to save scan trends:', { error: trendsError, scan_id: scan.id })
    }

    return { 
      id: scan.id, 
      score: scanResult.score, 
      issues: scanResult.issues,
      trends 
    }
  } catch (error) {
    // Update scan record as failed
    await supabase
      .from('scans')
      .update({
        status: 'failed',
        finished_at: new Date().toISOString()
      } satisfies Partial<ScanInsert>)
      .eq('id', scan.id)

    throw error
  }
}

async function runMonitoring(): Promise<MonitoringSummary> {
  const startTime = new Date()
  devLog(`\n🚀 Starting monitoring run at ${format(startTime, 'PPpp')}`)

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all sites with monitoring enabled
  const { data: sites, error: sitesError } = await supabase
    .from('sites')
    .select('*')
    .eq('monitoring_enabled', true)

  if (sitesError) {
    logError('Failed to fetch monitored sites:', { error: sitesError })
    throw new Error(`Failed to fetch monitored sites: ${sitesError.message}`)
  }

  devLog(`📋 Found ${sites.length} sites to monitor`)

  const summary: MonitoringSummary = {
    totalSites: sites.length,
    successfulScans: 0,
    failedScans: 0,
    totalIssuesFound: 0,
    averageScore: 0,
    totalNewIssues: 0,
    totalResolvedIssues: 0,
    criticalIssuesDelta: 0,
    seriousIssuesDelta: 0,
    moderateIssuesDelta: 0,
    minorIssuesDelta: 0,
    siteResults: []
  }

  // Process each site
  for (const site of sites) {
    let retryCount = 0
    let success = false
    let result: ScanResult | null = null
    let error: Error | null = null

    while (retryCount <= MAX_RETRIES && !success) {
      try {
        if (retryCount > 0) {
          devLog(`⏳ Retrying scan for ${site.name || site.url} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`)
          await delay(RETRY_DELAY)
        }

        result = await scanSite(supabase, site, retryCount)
        success = true
      } catch (e) {
        error = e as Error
        retryCount++

        if (retryCount <= MAX_RETRIES) {
          logError(`Scan failed, will retry:`, { error: e, site: site.url, attempt: retryCount })
        }
      }
    }

    // Record result
    if (success && result) {
      summary.successfulScans++
      summary.totalIssuesFound += result.issues.length
      summary.averageScore += result.score

      if (result.trends) {
        summary.totalNewIssues += result.trends.newIssuesCount
        summary.totalResolvedIssues += result.trends.resolvedIssuesCount
        summary.criticalIssuesDelta += result.trends.criticalIssuesDelta
        summary.seriousIssuesDelta += result.trends.seriousIssuesDelta
        summary.moderateIssuesDelta += result.trends.moderateIssuesDelta
        summary.minorIssuesDelta += result.trends.minorIssuesDelta
      }

      summary.siteResults.push({
        name: site.name || site.url,
        url: site.url,
        status: 'success',
        score: result.score,
        issuesCount: result.issues.length,
        retries: retryCount
      })
    } else {
      summary.failedScans++
      summary.siteResults.push({
        name: site.name || site.url,
        url: site.url,
        status: 'failure',
        error: error?.message || 'Unknown error',
        retries: retryCount
      })
    }

    // Add delay between sites
    if (sites.indexOf(site) < sites.length - 1) {
      await delay(SITE_DELAY)
    }
  }

  // Calculate final averages
  if (summary.successfulScans > 0) {
    summary.averageScore = summary.averageScore / summary.successfulScans
  }

  const endTime = new Date()
  const duration = (endTime.getTime() - startTime.getTime()) / 1000

  // Save monitoring summary
  const { error: summaryError } = await supabase
    .from('monitoring_summary_logs')
    .insert({
      sites_monitored: summary.totalSites,
      successful_scans: summary.successfulScans,
      failed_scans: summary.failedScans,
      average_score: summary.averageScore,
      total_violations: summary.totalIssuesFound,
      execution_time_seconds: Math.round(duration)
    })

  if (summaryError) {
    logError('Failed to save monitoring summary:', { error: summaryError })
  }

  // Log final summary
  const summaryLog = [
    `\n📊 Monitoring Summary (${format(startTime, 'PPpp')} - ${format(endTime, 'PPpp')})`,
    `Duration: ${Math.round(duration)} seconds`,
    `Total Sites: ${summary.totalSites}`,
    `Successful Scans: ${summary.successfulScans}`,
    `Failed Scans: ${summary.failedScans}`,
    `Average Score: ${summary.averageScore.toFixed(2)}/100`,
    `Total Issues Found: ${summary.totalIssuesFound}`,
    `New Issues: ${summary.totalNewIssues}`,
    `Resolved Issues: ${summary.totalResolvedIssues}`,
    `\nIssue Severity Changes:`,
    `Critical: ${summary.criticalIssuesDelta > 0 ? '+' : ''}${summary.criticalIssuesDelta}`,
    `Serious: ${summary.seriousIssuesDelta > 0 ? '+' : ''}${summary.seriousIssuesDelta}`,
    `Moderate: ${summary.moderateIssuesDelta > 0 ? '+' : ''}${summary.moderateIssuesDelta}`,
    `Minor: ${summary.minorIssuesDelta > 0 ? '+' : ''}${summary.minorIssuesDelta}`,
    `\nSite Results:`,
    ...summary.siteResults.map(result => {
      if (result.status === 'success') {
        return `✅ ${result.name}: Score ${result.score}/100 (${result.issuesCount} issues)${
          result.retries ? ` [${result.retries} retries]` : ''
        }`
      } else {
        return `❌ ${result.name}: Failed - ${result.error}${
          result.retries ? ` [${result.retries} retries]` : ''
        }`
      }
    })
  ].join('\n')

  // Always log the summary, even in cron mode
  console.log(summaryLog)

  return summary
}

// Run the monitoring if this is the main module
if (require.main === module) {
  runMonitoring().catch(error => {
    logError('Fatal error in monitoring script:', { error })
    process.exit(1)
  })
}

export { runMonitoring } 
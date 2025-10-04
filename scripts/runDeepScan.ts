/**
 * Deep Scan v1 Prototype - Main Orchestrator
 * Runs multi-page, multi-state accessibility scans with tier classification
 */

import { chromium, type Browser, type Page } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'
import { crawlPages, getScanProfileConfig } from './crawler/pageCrawler'
import { testPageStates, type PageState } from './scanner/stateInteractions'
import { classifyIssue, summarizeByTier } from './scanner/issueTiers'

export interface DeepScanOptions {
  url: string
  scanProfile: 'quick' | 'standard' | 'deep'
  timeout?: number
}

export interface DeepScanIssue {
  rule: string
  impact: string
  description: string
  helpUrl: string
  selector: string
  html: string
  wcagTags: string[]
  // Deep scan additions
  pageUrl: string
  pageState: string
  tier: 'violation' | 'advisory'
  wcagReference?: string
  requiresManualReview: boolean
}

export interface PageScanResult {
  url: string
  title?: string
  states: PageState[]
  issues: DeepScanIssue[]
  violations: number
  advisories: number
}

export interface DeepScanResult {
  // Summary
  url: string
  scanProfile: 'quick' | 'standard' | 'deep'
  pagesScanned: number
  statesAudited: number
  totalIssues: number
  violationsCount: number
  advisoriesCount: number
  
  // Per-page results
  pages: PageScanResult[]
  
  // Metadata
  timestamp: string
  timeToScan: number
  platform?: {
    name: string
    confidence: number
  }
  
  // Screenshot for preview
  screenshot?: string // base64 encoded
  
  // Aggregated issues (deduplicated)
  issues: DeepScanIssue[]
}

export class DeepAccessibilityScanner {
  private browser: Browser | null = null

  async scan(options: DeepScanOptions): Promise<DeepScanResult> {
    const startTime = Date.now()
    console.log('\n🔍 Starting Deep Scan v1 Prototype')
    console.log('=====================================')
    console.log(`URL: ${options.url}`)
    console.log(`Profile: ${options.scanProfile}`)
    
    try {
      // Initialize browser
      this.browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
      })
      console.log('✅ Browser launched')

      const page = await this.browser.newPage()
      console.log('✅ Page created')

      // Get crawl config based on profile
      const crawlConfig = getScanProfileConfig(options.scanProfile)
      console.log(`📋 Crawl config:`, crawlConfig)

      // Step 1: Crawl pages
      console.log('\n📡 Step 1: Crawling pages...')
      const pagesToScan = await crawlPages(page, options.url, crawlConfig)
      console.log(`✅ Found ${pagesToScan.length} pages to scan`)

      // Step 2: Scan each page with state testing
      console.log('\n🔬 Step 2: Scanning pages...')
      const pageResults: PageScanResult[] = []
      let totalStates = 0
      let screenshotBase64: string | undefined

      for (const pageInfo of pagesToScan) {
        console.log(`\n🌐 Scanning: ${pageInfo.url}`)
        
        try {
          // Navigate to page
          await page.goto(pageInfo.url, {
            waitUntil: 'networkidle',
            timeout: 30000
          })
          await page.waitForTimeout(2000)

          // Capture screenshot of first page for preview
          if (!screenshotBase64 && pageInfo.url === options.url) {
            try {
              const screenshot = await page.screenshot({
                type: 'jpeg',
                quality: 80,
                fullPage: false // Only visible viewport
              })
              screenshotBase64 = `data:image/jpeg;base64,${screenshot.toString('base64')}`
              console.log('📸 Captured screenshot for preview')
            } catch (screenshotError) {
              console.warn('⚠️ Failed to capture screenshot:', screenshotError)
            }
          }

          // Test different states
          const stateResult = await testPageStates(page, options.scanProfile)
          totalStates += stateResult.totalStates
          console.log(`✅ Tested ${stateResult.totalStates} states`)

          // Scan each state
          const issuesForPage: DeepScanIssue[] = []
          for (const state of stateResult.states) {
            if (!state.success && state.name !== 'default') {
              console.log(`⏭️  Skipping state "${state.name}" (not successful)`)
              continue
            }

            console.log(`🔍 Scanning state: ${state.name}`)
            const stateIssues = await this.scanCurrentState(page, pageInfo.url, state.name)
            issuesForPage.push(...stateIssues)
            console.log(`  Found ${stateIssues.length} issues`)
          }

          // Deduplicate issues for this page
          const dedupedIssues = this.deduplicateIssues(issuesForPage)
          const summary = summarizeByTier(dedupedIssues)

          pageResults.push({
            url: pageInfo.url,
            title: pageInfo.title,
            states: stateResult.states,
            issues: dedupedIssues,
            violations: summary.violations,
            advisories: summary.advisories
          })

          console.log(`✅ Page complete: ${summary.violations} violations, ${summary.advisories} advisories`)
        } catch (error) {
          console.error(`❌ Error scanning ${pageInfo.url}:`, error)
          // Continue with next page
        }
      }

      // Step 3: Aggregate results
      console.log('\n📊 Step 3: Aggregating results...')
      const allIssues = pageResults.flatMap(p => p.issues)
      const deduplicatedIssues = this.deduplicateIssues(allIssues)
      const totalSummary = summarizeByTier(deduplicatedIssues)

      // Detect platform
      const platform = await this.detectPlatform(page, options.url)

      await page.close()
      await this.browser.close()
      this.browser = null

      const endTime = Date.now()
      const timeToScan = (endTime - startTime) / 1000

      const result: DeepScanResult = {
        url: options.url,
        scanProfile: options.scanProfile,
        pagesScanned: pageResults.length,
        statesAudited: totalStates,
        totalIssues: deduplicatedIssues.length,
        violationsCount: totalSummary.violations,
        advisoriesCount: totalSummary.advisories,
        pages: pageResults,
        timestamp: new Date().toISOString(),
        timeToScan,
        platform,
        screenshot: screenshotBase64,
        issues: deduplicatedIssues
      }

      console.log('\n✅ Deep Scan Complete!')
      console.log('=====================================')
      console.log(`Pages scanned: ${result.pagesScanned}`)
      console.log(`States tested: ${result.statesAudited}`)
      console.log(`Total issues: ${result.totalIssues}`)
      console.log(`  Violations: ${result.violationsCount}`)
      console.log(`  Advisories: ${result.advisoriesCount}`)
      console.log(`Time: ${timeToScan.toFixed(2)}s`)

      return result
    } catch (error) {
      console.error('❌ Deep scan failed:', error)
      if (this.browser) {
        await this.browser.close()
      }
      throw error
    }
  }

  /**
   * Scan current page state with axe-core
   */
  private async scanCurrentState(
    page: Page,
    pageUrl: string,
    stateName: string
  ): Promise<DeepScanIssue[]> {
    try {
      // Inject axe-core from local file
      const axePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js')
      if (!fs.existsSync(axePath)) {
        throw new Error(`axe-core not found at ${axePath}`)
      }
      
      await page.addScriptTag({
        path: axePath
      })

      // Run axe scan
      const axeResults = await page.evaluate(async () => {
        return await (window as any).axe.run()
      })

      // Process violations
      const issues: DeepScanIssue[] = []
      for (const violation of axeResults.violations) {
        // Classify this rule
        const classification = classifyIssue(violation.id)

        // Process each node
        for (const node of violation.nodes) {
          issues.push({
            rule: violation.id,
            impact: node.impact || 'minor',
            description: violation.description,
            helpUrl: violation.helpUrl,
            selector: node.target.join(', '),
            html: node.html,
            wcagTags: violation.tags.filter((t: string) => t.startsWith('wcag')),
            // Deep scan additions
            pageUrl,
            pageState: stateName,
            tier: classification.tier,
            wcagReference: classification.wcagReference,
            requiresManualReview: classification.requiresManualReview
          })
        }
      }

      return issues
    } catch (error) {
      console.error('[Scan] Error running axe:', error)
      return []
    }
  }

  /**
   * Deduplicate issues by selector + rule + page URL
   */
  private deduplicateIssues(issues: DeepScanIssue[]): DeepScanIssue[] {
    const seen = new Set<string>()
    const deduplicated: DeepScanIssue[] = []

    for (const issue of issues) {
      // Create fingerprint: rule + selector + page (ignore state)
      const fingerprint = `${issue.rule}::${issue.selector}::${issue.pageUrl}`
      
      if (!seen.has(fingerprint)) {
        seen.add(fingerprint)
        deduplicated.push(issue)
      }
    }

    return deduplicated
  }

  /**
   * Detect platform (reusing existing logic)
   */
  private async detectPlatform(page: Page, _url: string): Promise<{ name: string; confidence: number } | undefined> {
    try {
      const result = await page.evaluate(() => {
        const html = document.documentElement.outerHTML
        const platforms = [
          { name: 'Webflow', pattern: /webflow/i, confidence: 0.8 },
          { name: 'WordPress', pattern: /wp-content|wordpress/i, confidence: 0.8 },
          { name: 'Framer', pattern: /framer/i, confidence: 0.8 },
          { name: 'Next.js', pattern: /__next/i, confidence: 0.7 },
          { name: 'React', pattern: /react/i, confidence: 0.6 }
        ]

        for (const platform of platforms) {
          if (platform.pattern.test(html)) {
            return { name: platform.name, confidence: platform.confidence }
          }
        }
        return undefined
      })
      return result
    } catch {
      return undefined
    }
  }
}

// Export a convenience function
export async function runDeepScan(options: DeepScanOptions): Promise<DeepScanResult> {
  const scanner = new DeepAccessibilityScanner()
  return await scanner.scan(options)
}


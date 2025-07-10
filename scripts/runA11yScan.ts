import { chromium, type Browser, type Page } from 'playwright'
import type { AxeResults, Result, ImpactValue, NodeResult } from 'axe-core'

interface ScanOptions {
  url: string
  timeout?: number
  waitForSelector?: string
  viewport?: {
    width: number
    height: number
  }
}

interface ScanResult {
  score: number
  violations: Result[]
  timestamp: string
  url: string
  totalViolations: number
  passes: number
  incomplete: number
  inapplicable: number
  timeToScan: number
  issues: Array<{
    rule: string
    impact: ImpactValue
    description: string
    helpUrl: string
    selector: string
    html: string
  }>
  summary: {
    byImpact: {
      critical?: number
      serious?: number
      moderate?: number
      minor?: number
    }
  }
}

export class AccessibilityScanner {
  private browser: Browser | null = null
  private page: Page | null = null

  private async initialize() {
    console.log('🚀 Initializing browser...')
    if (!this.browser) {
      this.browser = await chromium.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // Set headless: false temporarily for debugging
        headless: false
      })
      console.log('✅ Browser launched')
    }
    if (!this.page) {
      this.page = await this.browser.newPage()
      console.log('✅ Page created')
    }
  }

  private async cleanup() {
    console.log('🧹 Cleaning up...')
    if (this.page) {
      await this.page.close()
      this.page = null
      console.log('✅ Page closed')
    }
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      console.log('✅ Browser closed')
    }
  }

  private calculateScore(violations: Result[]): number {
    // Weight different impact levels
    const weights = {
      critical: 25,
      serious: 10,
      moderate: 5,
      minor: 2
    }

    let totalImpact = 0
    let maxPossibleImpact = 0

    violations.forEach(violation => {
      const weight = weights[violation.impact as keyof typeof weights] || 0
      totalImpact += weight * violation.nodes.length
      maxPossibleImpact += weights.critical * violation.nodes.length
    })

    // Calculate score (100 = perfect, 0 = worst)
    const score = maxPossibleImpact > 0 
      ? Math.max(0, 100 - (totalImpact / maxPossibleImpact) * 100)
      : 100

    console.log('📊 Score calculation:', {
      totalImpact,
      maxPossibleImpact,
      finalScore: Math.round(score)
    })

    return Math.round(score)
  }

  public async scan(options: ScanOptions): Promise<ScanResult> {
    const startTime = Date.now()
    console.log(`\n🔍 Starting accessibility scan for: ${options.url}`)
    console.log('=====================================')
    
    try {
      await this.initialize()
      if (!this.page) throw new Error('Failed to initialize page')

      // Set viewport if specified
      if (options.viewport) {
        await this.page.setViewportSize(options.viewport)
        console.log('✅ Viewport set:', options.viewport)
      }

      // Navigate to URL with timeout and wait for network idle
      console.log('🌐 Navigating to URL...')
      await this.page.goto(options.url, {
        waitUntil: 'domcontentloaded',
        timeout: options.timeout || 60000
      })
      console.log('✅ Page loaded')

      // Add a small delay to allow for any immediate post-load scripts
      await this.page.waitForTimeout(2000)
      console.log('⏳ Waited for post-load scripts')

      // Wait for specific selector if provided
      if (options.waitForSelector) {
        console.log(`⏳ Waiting for selector: ${options.waitForSelector}`)
        await this.page.waitForSelector(options.waitForSelector, {
          timeout: options.timeout || 60000
        })
        console.log('✅ Selector found')
      }

      // Take a screenshot for verification (during development)
      await this.page.screenshot({ path: 'scan-verification.png' })
      console.log('📸 Screenshot saved as scan-verification.png')

      // Inject axe-core from CDN
      console.log('💉 Injecting axe-core...')
      await this.page.addScriptTag({
        url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js'
      })

      // Wait for axe to be available and verify it's loaded
      await this.page.waitForFunction(() => {
        const axeLoaded = !!(window as any).axe
        console.log('axe-core loaded:', axeLoaded)
        return axeLoaded
      })
      console.log('✅ axe-core loaded')

      // Run the accessibility scan
      console.log('🔎 Running axe-core analysis...')
      const results = await this.page.evaluate(() => {
        return new Promise<AxeResults>((resolve, reject) => {
          // Log that we're starting the scan
          console.log('Starting axe.run...')
          
          // @ts-ignore - axe is injected at runtime
          window.axe.run(document, {
            resultTypes: ['violations', 'passes', 'inapplicable', 'incomplete'],
            runOnly: {
              type: 'tag',
              values: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag22aa']
            }
          }, (err: Error | null, results: AxeResults) => {
            if (err) {
              console.error('axe.run error:', err)
              reject(err)
              return
            }
            console.log('axe.run completed:', {
              violations: results.violations.length,
              passes: results.passes.length,
              incomplete: results.incomplete.length,
              inapplicable: results.inapplicable.length
            })
            resolve(results)
          })
        })
      })

      console.log('✅ Scan completed')
      console.log('\n📊 Results Summary:')
      console.log('------------------')
      console.log('Violations:', results.violations.length)
      console.log('Passes:', results.passes.length)
      console.log('Incomplete:', results.incomplete.length)
      console.log('Inapplicable:', results.inapplicable.length)

      // Log detailed violations
      if (results.violations.length > 0) {
        console.log('\n🚨 Detailed Violations:')
        results.violations.forEach((violation, index) => {
          console.log(`\n[${index + 1}/${results.violations.length}] ${violation.id}`)
          console.log('Impact:', violation.impact)
          console.log('Description:', violation.description)
          console.log('Help URL:', violation.helpUrl)
        })
      }

      // Calculate summary by impact
      const byImpact = results.violations.reduce((acc, violation) => {
        const impact = violation.impact as keyof typeof acc
        acc[impact] = (acc[impact] || 0) + violation.nodes.length
        return acc
      }, {} as Record<string, number>)

      // Prepare final result
      const scanResult: ScanResult = {
        score: this.calculateScore(results.violations),
        violations: results.violations,
        timestamp: new Date().toISOString(),
        url: options.url,
        totalViolations: results.violations.length,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        inapplicable: results.inapplicable.length,
        timeToScan: Date.now() - startTime,
        issues: results.violations.flatMap(violation => 
          violation.nodes.map(node => ({
            rule: violation.id,
            impact: violation.impact as ImpactValue,
            description: violation.description,
            helpUrl: violation.helpUrl,
            selector: node.target.join(' '),
            html: node.html
          }))
        ),
        summary: {
          byImpact
        }
      }

      return scanResult

    } catch (error) {
      console.error('❌ Scan failed:', error)
      throw error
    } finally {
      await this.cleanup()
    }
  }
}

// Create and export a convenience function for running scans
export async function runA11yScan(url: string, options: Partial<ScanOptions> = {}): Promise<ScanResult> {
  const scanner = new AccessibilityScanner()
  return scanner.scan({
    url,
    ...options
  })
} 
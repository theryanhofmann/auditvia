import { chromium } from 'npm:playwright'
import { AxeBuilder } from 'npm:@axe-core/playwright'

export interface ScanResult {
  score: number
  totalViolations: number
  violations: Array<{
    id: string
    impact: string
    description: string
    helpUrl: string
    html: string
    target: string[]
  }>
}

export async function runA11yScan(url: string): Promise<ScanResult> {
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    
    // Run axe analysis
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    // Calculate score (100 - deductions based on severity)
    const severityWeights = {
      critical: 10,
      serious: 5,
      moderate: 3,
      minor: 1
    }

    let deductions = 0
    results.violations.forEach((v) => {
      const weight = severityWeights[v.impact as keyof typeof severityWeights] || 1
      deductions += weight * v.nodes.length
    })

    const score = Math.max(0, 100 - deductions)

    return {
      score,
      totalViolations: results.violations.length,
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact || 'minor', // Default to minor if impact is undefined
        description: v.description,
        helpUrl: v.helpUrl,
        html: v.nodes[0]?.html || '',
        target: (v.nodes[0]?.target || []).map(String) // Convert target to string array
      }))
    }
  } finally {
    await browser.close()
  }
} 
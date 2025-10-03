/**
 * Verdict System - Replaces arbitrary scores with clear compliance status
 * Based on WCAG 2.2 Level AA and ADA standards
 */

export type VerdictStatus = 'compliant' | 'at-risk' | 'non-compliant'
export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor'

export interface VerdictResult {
  status: VerdictStatus
  title: string
  description: string
  riskLevel: string
  wcagLevel: string
  recommendations: string[]
}

export interface CategoryScore {
  category: string
  displayName: string
  score: number
  issueCount: number
  criticalCount: number
  humanImpact: string
  icon: string
}

/**
 * Calculate verdict based on issue counts and severity
 * 
 * Rules (per Phase 3 spec):
 * - Non-Compliant (❌): ≥1 Critical OR ≥3 Serious issues
 * - At Risk (⚠️): 1-2 Serious, OR >15 Moderate total
 * - Compliant (✅): 0 Critical, 0-1 Serious, and ≤15 Moderate
 */
export function calculateVerdict(
  criticalCount: number,
  seriousCount: number,
  moderateCount: number,
  minorCount: number
): VerdictResult {
  // Non-compliant: ≥1 Critical OR ≥3 Serious
  if (criticalCount >= 1 || seriousCount >= 3) {
    return {
      status: 'non-compliant',
      title: 'Non-Compliant',
      description: 'High Risk of ADA/WCAG violations',
      riskLevel: 'High legal risk',
      wcagLevel: 'WCAG 2.2 Level AA target',
      recommendations: [
        'Address critical issues immediately to reduce legal risk',
        'Fix serious violations that impact screen reader users',
        'Consider professional accessibility audit for compliance certification'
      ]
    }
  }

  // At Risk: 1-2 Serious, OR >15 Moderate
  if (seriousCount >= 1 || moderateCount > 15) {
    return {
      status: 'at-risk',
      title: 'At Risk',
      description: 'Medium Risk — compliance gaps detected',
      riskLevel: 'Moderate legal risk',
      wcagLevel: 'WCAG 2.2 Level AA target',
      recommendations: [
        'Fix serious issues to improve WCAG compliance',
        'Review and prioritize moderate violations',
        'Enable monitoring to track remediation progress'
      ]
    }
  }

  // Compliant: 0 Critical, 0-1 Serious, ≤15 Moderate
  return {
    status: 'compliant',
    title: 'Compliant',
    description: 'Meets WCAG 2.2 Level AA standards',
    riskLevel: 'Low legal risk',
    wcagLevel: 'WCAG 2.2 Level AA',
    recommendations: [
      'Address remaining minor issues for best-in-class accessibility',
      'Enable monitoring to maintain compliance over time',
      'Consider WCAG AAA for enhanced accessibility (optional)'
    ]
  }
}

/**
 * Group issues by category with human impact descriptions
 */
export function categorizeIssues(issues: any[]): CategoryScore[] {
  const categories = {
    clickables: {
      displayName: 'Clickables',
      humanImpact: 'People using keyboards and screen readers cannot interact with buttons and links',
      icon: 'hand-pointer'
    },
    titles: {
      displayName: 'Titles',
      humanImpact: 'Screen reader users cannot understand page structure and navigation',
      icon: 'heading'
    },
    menus: {
      displayName: 'Menus',
      humanImpact: 'Navigation is confusing or impossible for keyboard and screen reader users',
      icon: 'menu'
    },
    graphics: {
      displayName: 'Graphics',
      humanImpact: 'People with visual impairments cannot access information in images',
      icon: 'image'
    },
    contrast: {
      displayName: 'Contrast',
      humanImpact: 'People with low vision cannot read text due to insufficient color contrast',
      icon: 'eye'
    },
    carousels: {
      displayName: 'Carousels',
      humanImpact: 'Automated content is inaccessible to screen reader and keyboard users',
      icon: 'layout-grid'
    },
    tables: {
      displayName: 'Tables',
      humanImpact: 'Screen reader users cannot understand table structure and data relationships',
      icon: 'table'
    },
    general: {
      displayName: 'General',
      humanImpact: 'Various accessibility issues affect users with different disabilities',
      icon: 'alert-circle'
    }
  }

  const categorized: CategoryScore[] = []

  for (const [key, config] of Object.entries(categories)) {
    const categoryIssues = issues.filter(issue => 
      getCategoryForIssue(issue) === key
    )

    if (categoryIssues.length > 0) {
      const criticalCount = categoryIssues.filter(i => i.impact === 'critical').length
      const totalCount = categoryIssues.length

      // Calculate score (0-100, inverse of issues)
      const maxIssues = 20 // Normalize to max 20 issues per category
      const score = Math.max(0, Math.round(100 - (totalCount / maxIssues) * 100))

      categorized.push({
        category: key,
        displayName: config.displayName,
        score,
        issueCount: totalCount,
        criticalCount,
        humanImpact: config.humanImpact,
        icon: config.icon
      })
    }
  }

  return categorized.sort((a, b) => {
    // Sort by critical count first, then by total issues
    if (a.criticalCount !== b.criticalCount) {
      return b.criticalCount - a.criticalCount
    }
    return b.issueCount - a.issueCount
  })
}

/**
 * Determine category for an issue based on rule ID
 */
function getCategoryForIssue(issue: any): string {
  // Ensure ruleId is always a string
  const ruleId = String(issue.rule_id || issue.id || issue.rule || '').toLowerCase()

  // Button/link related
  if (ruleId.includes('button') || ruleId.includes('link') || ruleId.includes('aria-allowed-role')) {
    return 'clickables'
  }

  // Heading/title related
  if (ruleId.includes('heading') || ruleId.includes('page-has-heading') || ruleId.includes('h1')) {
    return 'titles'
  }

  // Menu/navigation related
  if (ruleId.includes('menu') || ruleId.includes('navigation') || ruleId.includes('landmark')) {
    return 'menus'
  }

  // Image/alt related
  if (ruleId.includes('image') || ruleId.includes('alt') || ruleId.includes('img')) {
    return 'graphics'
  }

  // Contrast related
  if (ruleId.includes('contrast') || ruleId.includes('color')) {
    return 'contrast'
  }

  // Carousel/slider related
  if (ruleId.includes('carousel') || ruleId.includes('slider') || ruleId.includes('region')) {
    return 'carousels'
  }

  // Table related
  if (ruleId.includes('table') || ruleId.includes('th') || ruleId.includes('td')) {
    return 'tables'
  }

  return 'general'
}

/**
 * Get severity weight for calculations
 */
export function getSeverityWeight(severity: IssueSeverity): number {
  const weights = {
    critical: 10,
    serious: 5,
    moderate: 2,
    minor: 1
  }
  return weights[severity] || 1
}

/**
 * Calculate compliance score (0-100) based on issues
 * This is for display purposes only - verdict is the primary indicator
 */
export function calculateComplianceScore(
  totalTests: number,
  passedTests: number,
  criticalCount: number,
  seriousCount: number
): number {
  if (totalTests === 0) return 0

  // Base score from pass rate
  const passRate = passedTests / totalTests
  let score = passRate * 100

  // Penalties for issues
  score -= criticalCount * 10  // -10 per critical
  score -= seriousCount * 3     // -3 per serious

  return Math.max(0, Math.min(100, Math.round(score)))
}


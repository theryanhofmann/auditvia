/**
 * Badge Calculator
 * Calculates current metrics for BadgeRibbon achievement system
 */

export interface BadgeMetrics {
  score: number
  issues_resolved: number
  scans: number
  github_issues: number
  risk_reduced: number
}

interface KPIData {
  avg_score_30d?: number
  total_violations_30d?: number
  total_scans_30d?: number
  prev_total_violations?: number
}

/**
 * Calculate badge metrics from various data sources
 */
export async function calculateBadgeMetrics(
  teamId: string,
  kpiData: KPIData | null | undefined
): Promise<BadgeMetrics> {
  // Score: current compliance score
  const score = kpiData?.avg_score_30d || 0

  // Issues resolved: calculate from violation delta
  const currentViolations = kpiData?.total_violations_30d || 0
  const prevViolations = kpiData?.prev_total_violations || currentViolations
  const issues_resolved = Math.max(0, prevViolations - currentViolations)

  // Scans: total completed scans
  const scans = kpiData?.total_scans_30d || 0

  // GitHub issues: fetch from database
  let github_issues = 0
  try {
    const response = await fetch(`/api/github/issues/count?teamId=${teamId}`)
    if (response.ok) {
      const data = await response.json()
      github_issues = data.count || 0
    }
  } catch (error) {
    console.warn('Failed to fetch GitHub issues count:', error)
  }

  // Risk reduced: modeled value based on violations fixed
  const riskPerViolation = 200 // $200 per violation in modeled risk
  const risk_reduced = issues_resolved * riskPerViolation

  return {
    score,
    issues_resolved,
    scans,
    github_issues,
    risk_reduced,
  }
}

/**
 * Detect milestones that should trigger celebration toasts
 */
export interface Milestone {
  id: string
  type: 'score' | 'violations' | 'github' | 'scan'
  title: string
  message: string
  achieved: boolean
}

export function detectMilestones(
  currentMetrics: BadgeMetrics,
  previousMetrics: BadgeMetrics | null
): Milestone[] {
  const milestones: Milestone[] = []

  if (!previousMetrics) return milestones

  // Score improvement milestone (crossed a 5-point threshold)
  const scoreThresholds = [70, 75, 80, 85, 90, 95]
  scoreThresholds.forEach(threshold => {
    if (currentMetrics.score >= threshold && previousMetrics.score < threshold) {
      milestones.push({
        id: `score_${threshold}`,
        type: 'score',
        title: 'Score Milestone!',
        message: `You've reached ${threshold}% compliance`,
        achieved: true,
      })
    }
  })

  // First GitHub issue created
  if (currentMetrics.github_issues === 1 && previousMetrics.github_issues === 0) {
    milestones.push({
      id: 'github_first',
      type: 'github',
      title: 'GitHub Integration Active!',
      message: 'Created your first issue',
      achieved: true,
    })
  }

  // Issues resolved milestones
  const resolvedThresholds = [10, 25, 50, 100, 250, 500]
  resolvedThresholds.forEach(threshold => {
    if (currentMetrics.issues_resolved >= threshold && previousMetrics.issues_resolved < threshold) {
      milestones.push({
        id: `resolved_${threshold}`,
        type: 'violations',
        title: 'Violations Fixed!',
        message: `${threshold}+ issues resolved`,
        achieved: true,
      })
    }
  })

  // Scan milestones
  const scanThresholds = [1, 5, 10, 25, 50, 100]
  scanThresholds.forEach(threshold => {
    if (currentMetrics.scans >= threshold && previousMetrics.scans < threshold) {
      milestones.push({
        id: `scans_${threshold}`,
        type: 'scan',
        title: 'Monitoring Milestone!',
        message: `${threshold}+ scans completed`,
        achieved: true,
      })
    }
  })

  // Risk reduced milestones ($1k, $5k, $10k, etc.)
  const riskThresholds = [1000, 5000, 10000, 25000, 50000, 100000]
  riskThresholds.forEach(threshold => {
    if (currentMetrics.risk_reduced >= threshold && previousMetrics.risk_reduced < threshold) {
      milestones.push({
        id: `risk_${threshold}`,
        type: 'violations',
        title: 'Risk Reduction!',
        message: `$${(threshold / 1000).toFixed(0)}k+ in modeled risk reduced`,
        achieved: true,
      })
    }
  })

  return milestones
}

/**
 * Store current metrics in sessionStorage for milestone detection
 */
const METRICS_KEY = 'auditvia_previous_metrics'

export function storeBadgeMetrics(metrics: BadgeMetrics): void {
  sessionStorage.setItem(METRICS_KEY, JSON.stringify(metrics))
}

export function getPreviousBadgeMetrics(): BadgeMetrics | null {
  const stored = sessionStorage.getItem(METRICS_KEY)
  if (!stored) return null
  
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

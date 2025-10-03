/**
 * Insights Generator
 * Dynamically creates AI insights from KPI and trend data
 */

import type { Insight } from '@/app/components/reports/InsightCard'

interface KPIData {
  avg_score_30d?: number
  total_violations_30d?: number
  total_scans_30d?: number
  total_sites?: number
  prev_avg_score?: number
  prev_total_violations?: number
}

interface TrendDataPoint {
  date: string
  critical?: number
  serious?: number
  moderate?: number
  minor?: number
  total?: number
  score?: number
}

interface TopRule {
  rule_id: string
  rule_name?: string
  description?: string
  count: number
  impact?: string
  severity?: string
  help_url?: string
}

export function generateInsights(
  kpiData: KPIData | null | undefined,
  trendData: TrendDataPoint[] | null | undefined,
  topRules: TopRule[] | null | undefined,
  onFilterChange: (filters: any) => void
): Insight[] {
  const insights: Insight[] = []

  if (!kpiData) return insights

  const currentScore = kpiData.avg_score_30d || 0
  const prevScore = kpiData.prev_avg_score || currentScore
  const scoreDelta = currentScore - prevScore

  const currentViolations = kpiData.total_violations_30d || 0
  const prevViolations = kpiData.prev_total_violations || currentViolations
  const violationsDelta = currentViolations - prevViolations

  // 1. Benchmark Insight (percentile ranking)
  const percentile = calculatePercentile(currentScore)
  if (percentile > 0) {
    insights.push({
      id: 'benchmark_percentile',
      type: 'benchmark',
      title: `Top ${percentile}% Performer`,
      subtitle: `Your ${currentScore.toFixed(0)}% score beats ${percentile}% of companies`,
      value: `${currentScore.toFixed(0)}%`,
      delta: scoreDelta,
      sparklineData: extractScoreSparkline(trendData),
      action: {
        label: 'View details',
        onClick: () => onFilterChange({ view: 'benchmark' })
      }
    })
  }

  // 2. Risk Delta Insight
  const riskReduced = calculateRiskReduced(violationsDelta)
  if (riskReduced !== 0) {
    insights.push({
      id: 'risk_delta',
      type: 'risk',
      title: riskReduced > 0 ? 'Risk Reduced' : 'Risk Increased',
      subtitle: `Modeled ADA lawsuit exposure ${riskReduced > 0 ? 'decreased' : 'increased'} this period`,
      value: `$${Math.abs(riskReduced).toLocaleString()}`,
      delta: -violationsDelta, // Negative violations = positive
      sparklineData: extractViolationsSparkline(trendData),
      action: {
        label: 'See projection',
        onClick: () => onFilterChange({ scrollTo: 'risk-chart' })
      }
    })
  }

  // 3. Hotspot Insight (fastest growing rule)
  if (topRules && topRules.length > 0) {
    const hottestRule = topRules[0]
    const ruleName = hottestRule.rule_name || hottestRule.description || hottestRule.rule_id
    insights.push({
      id: 'rule_hotspot',
      type: 'hotspot',
      title: 'Top Violation Rule',
      subtitle: `${ruleName} accounts for most issues`,
      value: `${hottestRule.count} instances`,
      sparklineData: undefined, // Could add rule-specific trend
      action: {
        label: 'Filter by this rule',
        onClick: () => onFilterChange({ ruleId: hottestRule.rule_id })
      }
    })
  }

  // 4. Forecast Insight (projected compliance date)
  const forecastDate = calculateComplianceDate(trendData, currentScore)
  if (forecastDate) {
    insights.push({
      id: 'forecast_compliance',
      type: 'forecast',
      title: 'Compliance Forecast',
      subtitle: 'Estimated WCAG AA compliance date at current pace',
      value: forecastDate,
      delta: scoreDelta,
      sparklineData: extractScoreSparkline(trendData),
      action: {
        label: 'View forecast',
        onClick: () => onFilterChange({ scrollTo: 'forecast-chart' })
      }
    })
  }

  // 5. Momentum Insight
  if (Math.abs(scoreDelta) > 5) {
    insights.push({
      id: 'momentum',
      type: scoreDelta > 0 ? 'forecast' : 'risk',
      title: scoreDelta > 0 ? 'Strong Momentum' : 'Losing Ground',
      subtitle: `Score ${scoreDelta > 0 ? 'improved' : 'declined'} by ${Math.abs(scoreDelta).toFixed(1)}% this period`,
      value: `${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(1)}%`,
      delta: scoreDelta,
      sparklineData: extractScoreSparkline(trendData),
    })
  }

  // 6. Activity Insight
  const totalScans = kpiData.total_scans_30d || 0
  if (totalScans > 0) {
    insights.push({
      id: 'activity_level',
      type: 'benchmark',
      title: 'Monitoring Activity',
      subtitle: `${totalScans} scans completed across ${kpiData.total_sites || 0} sites`,
      value: `${totalScans} scans`,
      sparklineData: undefined,
    })
  }

  return insights
}

// Helper: Calculate industry percentile (simple model)
function calculatePercentile(score: number): number {
  // Simple percentile model:
  // 95+ = top 5%
  // 90-95 = top 15%
  // 85-90 = top 30%
  // 80-85 = top 50%
  // <80 = below 50%
  
  if (score >= 95) return 95
  if (score >= 90) return 85
  if (score >= 85) return 70
  if (score >= 80) return 50
  if (score >= 70) return 30
  return 0 // Don't show if score is too low
}

// Helper: Calculate risk reduced from violation delta
function calculateRiskReduced(violationsDelta: number): number {
  // Simple model: each violation = ~$200 in modeled risk
  const riskPerViolation = 200
  return -violationsDelta * riskPerViolation // Negative delta = positive risk reduction
}

// Helper: Extract score sparkline from trend data
function extractScoreSparkline(trendData: TrendDataPoint[] | null | undefined): number[] {
  if (!trendData || trendData.length === 0) return []
  return trendData
    .slice(-7) // Last 7 data points
    .map(d => d.score || 0)
}

// Helper: Extract violations sparkline from trend data
function extractViolationsSparkline(trendData: TrendDataPoint[] | null | undefined): number[] {
  if (!trendData || trendData.length === 0) return []
  return trendData
    .slice(-7) // Last 7 data points
    .map(d => d.total || 0)
}

// Helper: Calculate projected compliance date
function calculateComplianceDate(
  trendData: TrendDataPoint[] | null | undefined,
  currentScore: number
): string | null {
  if (!trendData || trendData.length < 3) return null
  if (currentScore >= 90) return 'Already compliant'

  // Simple linear regression on last 7 days
  const recent = trendData.slice(-7)
  const scores = recent.map(d => d.score || 0).filter(s => s > 0)
  
  if (scores.length < 3) return null

  // Calculate average daily improvement
  const dailyImprovement = (scores[scores.length - 1] - scores[0]) / scores.length
  
  if (dailyImprovement <= 0) {
    return 'No improvement trend'
  }

  // Days to reach 90%
  const daysToCompliance = Math.ceil((90 - currentScore) / dailyImprovement)
  
  if (daysToCompliance > 365) return '1+ year away'
  if (daysToCompliance > 180) return '6+ months away'
  if (daysToCompliance > 90) return '3+ months away'
  if (daysToCompliance > 30) return `~${Math.ceil(daysToCompliance / 30)} months`
  
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + daysToCompliance)
  
  return targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

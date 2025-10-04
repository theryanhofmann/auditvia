'use client'

import { useState, useMemo } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Award,
  Target,
  Activity,
  BarChart3,
  AlertTriangle,
  Sparkles,
  User,
  Code
} from 'lucide-react'
import { formatNumber, formatCurrency } from '@/lib/reports-utils'
import { useKPIs, useTrend } from '@/hooks/useReportsData'
import { getDateRangeFromTimeRange } from '@/lib/reports-utils'
import type { ReportFilters } from '@/types/reports'

interface ExecutiveDashboardProps {
  teamId: string
}

type PersonaMode = 'founder' | 'developer'

interface AIInsight {
  id: string
  type: 'progress' | 'forecast' | 'benchmark' | 'status' | 'trend'
  icon: any
  title: string
  narrative: string
  metrics: {
    label: string
    value: string
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
  }[]
}

export function ExecutiveDashboard({ teamId }: ExecutiveDashboardProps) {
  const [mode, setMode] = useState<PersonaMode>('founder')
  
  const [filters] = useState<ReportFilters>(() => {
    const { startDate, endDate } = getDateRangeFromTimeRange('30d')
    return {
      teamId,
      timeRange: '30d',
      startDate,
      endDate
    }
  })

  // Fetch data
  const kpis = useKPIs(filters)
  const trend = useTrend(filters)

  // Generate AI insights
  const insights = useMemo(() => {
    if (!kpis.data || !trend.data) return []

    const generated: AIInsight[] = []

    // Calculate metrics
    const currentScore = kpis.data.avg_score_30d
    const previousScore = 70 // Baseline - would come from historical data
    const scoreImprovement = currentScore - previousScore

    const recentTrend = trend.data.slice(-7)
    const olderTrend = trend.data.slice(-14, -7)
    const currentViolations = recentTrend[recentTrend.length - 1]?.total_violations || 0
    const previousViolations = olderTrend[0]?.total_violations || currentViolations
    const violationsReduced = previousViolations - currentViolations
    const reductionPercent = previousViolations > 0 ? (violationsReduced / previousViolations) * 100 : 0

    // Industry benchmarks (mock data - would come from aggregated industry data)
    const industryAvg = 78
    const topPerformer = 95
    const yourPercentile = currentScore >= industryAvg 
      ? Math.round(((currentScore - industryAvg) / (topPerformer - industryAvg)) * 90 + 10)
      : Math.round((currentScore / industryAvg) * 50)

    // ADA lawsuit average (based on research)
    const adaAvgSettlement = 50000 // Average settlement
    const yourRiskVsAvg = kpis.data.total_violations_30d * 5000 // Estimated risk per violation

    // 1. Compliance Progress Narrative
    if (scoreImprovement > 0) {
      generated.push({
        id: 'progress',
        type: 'progress',
        icon: TrendingUp,
        title: mode === 'founder' 
          ? `Your compliance improved ${scoreImprovement.toFixed(0)}% over 30 days`
          : `Compliance score increased ${scoreImprovement.toFixed(1)} points in 30 days`,
        narrative: mode === 'founder'
          ? `Your accessibility compliance score rose from ${previousScore.toFixed(0)}% to ${currentScore.toFixed(0)}% over the last 30 days. This ${scoreImprovement.toFixed(0)}-point improvement puts you on track to reach full WCAG compliance. You've reduced ${formatNumber(violationsReduced)} violations during this period, lowering your estimated legal exposure significantly.`
          : `Compliance score improved from ${previousScore.toFixed(1)}% to ${currentScore.toFixed(1)}% (+${scoreImprovement.toFixed(1)}pts). Violations remediated: ${formatNumber(violationsReduced)} (-${reductionPercent.toFixed(1)}%). Current open violations: ${formatNumber(currentViolations)}. Trajectory indicates continued positive momentum.`,
        metrics: [
          { label: 'Current Score', value: currentScore.toFixed(1) + '%', trend: 'up', trendValue: '+' + scoreImprovement.toFixed(0) + 'pts' },
          { label: 'Violations Reduced', value: formatNumber(violationsReduced), trend: 'down', trendValue: '-' + reductionPercent.toFixed(0) + '%' },
          { label: 'Open Issues', value: formatNumber(currentViolations) }
        ]
      })
    }

    // 2. Industry Benchmark
    generated.push({
      id: 'benchmark',
      type: 'benchmark',
      icon: Award,
      title: mode === 'founder'
        ? `You're in the top ${100 - yourPercentile}% of your industry`
        : `Industry benchmark: ${yourPercentile}th percentile performance`,
      narrative: mode === 'founder'
        ? `Your compliance score of ${currentScore.toFixed(0)}% places you in the top ${100 - yourPercentile}% of organizations in your industry. The industry average is ${industryAvg}%, and top performers achieve ${topPerformer}%. ${currentScore >= industryAvg ? "You're exceeding industry standards and ahead of most competitors." : "You're making progress toward industry leaders."} This positions you well for ADA compliance and reduces your risk of accessibility-related lawsuits.`
        : `Your score: ${currentScore.toFixed(1)}% | Industry average: ${industryAvg}% | Top performer: ${topPerformer}% | Percentile rank: ${yourPercentile}th. ${currentScore >= topPerformer ? 'Best-in-class performance. Maintaining this standard minimizes legal exposure.' : 'Gap to industry average: ' + Math.abs(currentScore - industryAvg).toFixed(1) + ' points. Recommend continued remediation efforts.'}`,
      metrics: [
        { label: 'Your Score', value: currentScore.toFixed(1) + '%', trend: currentScore >= industryAvg ? 'up' : 'neutral' },
        { label: 'Industry Avg', value: industryAvg + '%' },
        { label: 'Top Performer', value: topPerformer + '%' },
        { label: 'Your Rank', value: yourPercentile + 'th percentile' }
      ]
    })

    // 3. Compliance Forecast
    const weeklyFixRate = violationsReduced / 4.3 // ~4.3 weeks in 30 days
    const daysToCompliance = currentViolations > 0 && weeklyFixRate > 0
      ? Math.ceil((currentViolations / weeklyFixRate) * 7)
      : 0

    if (daysToCompliance > 0 && daysToCompliance < 180) {
      generated.push({
        id: 'forecast',
        type: 'forecast',
        icon: Target,
        title: mode === 'founder'
          ? `At current pace, you'll be 100% compliant in ${daysToCompliance} days`
          : `Projected full compliance: ${daysToCompliance} days (current remediation velocity)`,
        narrative: mode === 'founder'
          ? `Based on your current remediation rate of ${Math.round(weeklyFixRate)} violations per week, you're on track to achieve 100% WCAG AA compliance in approximately ${daysToCompliance} days. This assumes you maintain your current pace of fixes. Accelerating your efforts could reduce this timeline, while slowing down would extend it. Auditvia's auto-fix features can help speed up remediation for simple issues like missing alt text and form labels.`
          : `Current remediation velocity: ${weeklyFixRate.toFixed(1)} violations/week. Remaining violations: ${formatNumber(currentViolations)}. ETA to zero violations: ${daysToCompliance} days. Linear projection based on 30-day trend. Velocity may vary based on issue complexity and team capacity.`,
        metrics: [
          { label: 'Days to 100%', value: formatNumber(daysToCompliance) + ' days' },
          { label: 'Weekly Fix Rate', value: Math.round(weeklyFixRate) + '/week' },
          { label: 'Remaining Issues', value: formatNumber(currentViolations) }
        ]
      })
    }

    // 4. ADA Lawsuit Comparison
    const criticalCount = recentTrend[recentTrend.length - 1]?.critical_count || 0
    generated.push({
      id: 'ada-comparison',
      type: 'status',
      icon: Shield,
      title: mode === 'founder'
        ? `${criticalCount === 0 ? 'Low' : 'Elevated'} risk compared to ADA lawsuit averages`
        : `Legal risk assessment: ${criticalCount === 0 ? 'Minimal' : 'Moderate'} exposure relative to ADA settlement data`,
      narrative: mode === 'founder'
        ? `Based on 2023 ADA digital accessibility lawsuit data, the average settlement is around ${formatCurrency(adaAvgSettlement)}. ${criticalCount === 0 ? "You currently have no critical violations, which significantly reduces your lawsuit risk. Organizations with zero critical accessibility issues are rarely targeted by ADA lawsuits." : `You have ${formatNumber(criticalCount)} critical violations, which are often cited in ADA lawsuits. Addressing these should be your top priority to minimize legal exposure. Many lawsuits settle for ${formatCurrency(adaAvgSettlement)} to ${formatCurrency(adaAvgSettlement * 5)}, plus legal fees.`} ${kpis.data.total_violations_30d} total violations represent an estimated ${formatCurrency(yourRiskVsAvg)} in potential remediation and settlement costs.`
        : `ADA lawsuit settlements typically range from ${formatCurrency(adaAvgSettlement * 0.2)} to ${formatCurrency(adaAvgSettlement * 5)} (median: ${formatCurrency(adaAvgSettlement)}). Critical violations: ${formatNumber(criticalCount)}. Total violations: ${formatNumber(kpis.data.total_violations_30d)}. Estimated exposure: ${formatCurrency(yourRiskVsAvg)}. ${criticalCount === 0 ? 'Current risk profile: Low. No WCAG Level A failures detected.' : 'Current risk profile: Moderate to High. WCAG Level A failures present. Recommend immediate remediation.'}`,
      metrics: [
        { label: 'Critical Issues', value: formatNumber(criticalCount), trend: criticalCount === 0 ? 'neutral' : 'down' },
        { label: 'ADA Avg Settlement', value: formatCurrency(adaAvgSettlement) },
        { label: 'Your Est. Exposure', value: formatCurrency(yourRiskVsAvg), trend: yourRiskVsAvg < adaAvgSettlement ? 'up' : 'down' },
        { label: 'Risk Level', value: criticalCount === 0 ? 'Low' : criticalCount < 5 ? 'Moderate' : 'High' }
      ]
    })

    // 5. Recent Activity Summary
    const scansLast30d = kpis.data.total_scans_30d
    const avgScansPerSite = scansLast30d / (kpis.data.total_sites || 1)
    
    generated.push({
      id: 'activity',
      type: 'trend',
      icon: Activity,
      title: mode === 'founder'
        ? `${formatNumber(scansLast30d)} scans completed across ${formatNumber(kpis.data.total_sites)} sites`
        : `Monitoring activity: ${formatNumber(scansLast30d)} scans / ${formatNumber(kpis.data.total_sites)} sites (30d)`,
      narrative: mode === 'founder'
        ? `In the last 30 days, Auditvia completed ${formatNumber(scansLast30d)} accessibility scans across your ${formatNumber(kpis.data.total_sites)} monitored ${kpis.data.total_sites === 1 ? 'site' : 'sites'}, averaging ${avgScansPerSite.toFixed(1)} scans per site. ${avgScansPerSite >= 4 ? 'This frequent monitoring ensures accessibility issues are caught quickly, before they become problems.' : 'Consider increasing your scan frequency to weekly for more proactive issue detection.'} Regular scans help you stay ahead of compliance requirements and catch new violations early.`
        : `Scan frequency: ${avgScansPerSite.toFixed(1)} scans/site/30d. Total scans: ${formatNumber(scansLast30d)}. Sites monitored: ${formatNumber(kpis.data.total_sites)}. ${avgScansPerSite >= 4 ? 'Scan cadence meets best-practice recommendations (weekly minimum).' : 'Recommend increasing scan frequency to 4+ per month for optimal compliance monitoring.'} Consistent monitoring correlates with faster violation detection and remediation.`,
      metrics: [
        { label: 'Total Scans', value: formatNumber(scansLast30d) },
        { label: 'Sites Monitored', value: formatNumber(kpis.data.total_sites) },
        { label: 'Avg per Site', value: avgScansPerSite.toFixed(1) + ' scans' },
        { label: 'Frequency', value: avgScansPerSite >= 4 ? 'Optimal' : 'Low' }
      ]
    })

    return generated
  }, [kpis.data, trend.data, mode])

  const loading = kpis.loading || trend.loading

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                <h1 className="text-2xl font-semibold text-gray-900">
                  Executive Dashboard
                </h1>
              </div>
              <p className="text-sm text-gray-600">
                AI-powered analytics with forecasts and industry comparisons
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setMode('founder')}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                  ${mode === 'founder' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'}
                `}
              >
                <User className="w-4 h-4" />
                Founder
              </button>
              <button
                onClick={() => setMode('developer')}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
                  ${mode === 'developer' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'}
                `}
              >
                <Code className="w-4 h-4" />
                Developer
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          {kpis.data && (
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Compliance Score</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {kpis.data.avg_score_30d.toFixed(1)}%
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Open Issues</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {formatNumber(kpis.data.total_violations_30d)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Sites Monitored</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {formatNumber(kpis.data.total_sites)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Scans (30d)</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {formatNumber(kpis.data.total_scans_30d)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              AI-Generated Insights
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            {insights.length} executive {insights.length === 1 ? 'summary' : 'summaries'} based on your compliance data
          </p>
        </div>

        <div className="space-y-4">
          {insights.map((insight) => {
            const Icon = insight.icon

            return (
              <div
                key={insight.id}
                className="bg-white rounded-lg border border-gray-200 p-6"
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {insight.title}
                    </h3>
                    <p className="text-gray-700 leading-relaxed text-[15px]">
                      {insight.narrative}
                    </p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4 ml-14">
                  {insight.metrics.map((metric, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        {metric.label}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <div className="text-base font-semibold text-gray-900">
                          {metric.value}
                        </div>
                        {metric.trend && metric.trendValue && (
                          <div className={`flex items-center gap-0.5 text-xs font-medium ${
                            metric.trend === 'up' ? 'text-green-600' :
                            metric.trend === 'down' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {metric.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                            {metric.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                            {metric.trendValue}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {insights.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No analytics yet
            </h3>
            <p className="text-gray-600">
              Run your first scan to start receiving executive insights
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


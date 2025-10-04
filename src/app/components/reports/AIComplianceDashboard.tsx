'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, 
  TrendingDown,
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Github,
  Mail,
  User,
  Code,
  Clock,
  Target,
  Award,
  BarChart3,
  Sparkles,
  
  
} from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/reports-utils'
import { calculateRiskReduction, RESEARCH_BASED_WEIGHTS } from '@/lib/risk-methodology'
import type { KPIData, TrendDataPoint, TopRule } from '@/types/reports'

interface AIComplianceDashboardProps {
  kpiData: KPIData | null
  trendData: TrendDataPoint[] | null
  topRules: TopRule[] | null
  loading: boolean
  teamId: string
}

type PersonaMode = 'founder' | 'developer'

interface AIInsight {
  id: string
  type: 'success' | 'warning' | 'action' | 'forecast' | 'benchmark'
  title: string
  narrative: string
  metrics?: {
    label: string
    value: string
    change?: string
  }[]
  actions?: {
    label: string
    action: 'fix' | 'github' | 'email' | 'view'
    icon: any
    primary?: boolean
  }[]
}

export function AIComplianceDashboard({
  kpiData,
  trendData,
  topRules,
  loading,
  teamId: _teamId
}: AIComplianceDashboardProps) {
  const router = useRouter()
  const [mode, setMode] = useState<PersonaMode>('founder')

  // Generate AI insights from data
  const insights = useMemo(() => {
    if (!kpiData || !trendData) return []

    const generated: AIInsight[] = []

    // Calculate key metrics
    const recentTrend = trendData.slice(-7)
    const previousTrend = trendData.slice(-14, -7)
    const last30Days = trendData.slice(-30)
    
    const currentViolations = recentTrend[recentTrend.length - 1]?.total_violations || 0
    const previousViolations = previousTrend[previousTrend.length - 1]?.total_violations || currentViolations
    const violationsFixed = Math.max(0, previousViolations - currentViolations)
    
    const currentCritical = recentTrend[recentTrend.length - 1]?.critical_count || 0
    const previousCritical = previousTrend[previousTrend.length - 1]?.critical_count || currentCritical
    const criticalFixed = Math.max(0, previousCritical - currentCritical)
    
    const currentSerious = recentTrend[recentTrend.length - 1]?.serious_count || 0
    const previousSerious = previousTrend[previousTrend.length - 1]?.serious_count || 0
    
    const currentModerate = recentTrend[recentTrend.length - 1]?.moderate_count || 0
    const currentMinor = recentTrend[recentTrend.length - 1]?.minor_count || 0
    
    const scoreImprovement = kpiData.avg_score_30d > 0 
      ? Math.round((kpiData.avg_score_30d - 70) * 100) / 100 
      : 0

    // Calculate risk reduction
    const riskReduction = calculateRiskReduction(
      {
        critical: previousCritical,
        serious: previousSerious,
        moderate: previousTrend[previousTrend.length - 1]?.moderate_count || 0,
        minor: previousTrend[previousTrend.length - 1]?.minor_count || 0
      },
      {
        critical: currentCritical,
        serious: currentSerious,
        moderate: currentModerate,
        minor: currentMinor
      }
    )

    // Calculate velocity (fixes per week)
    const totalFixesLast30d = last30Days.reduce((sum, day, idx) => {
      if (idx === 0) return 0
      const prev = last30Days[idx - 1]?.total_violations || 0
      const curr = day.total_violations || 0
      return sum + Math.max(0, prev - curr)
    }, 0)
    const weeklyFixRate = totalFixesLast30d / 4.3 // ~4.3 weeks in 30 days

    // Calculate time saved (estimate 30min per auto-fixable issue)
    const autoFixableCount = currentModerate + currentMinor // Moderate/minor are typically auto-fixable
    const timeSavedHours = Math.round(violationsFixed * 0.5) // 30min per fix

    // Insight 1: Main Compliance Story (Business Impact Translation)
    if (violationsFixed > 0) {
      generated.push({
        id: 'main-story',
        type: 'success',
        title: mode === 'founder'
          ? `Estimated Legal Exposure Reduced: ${formatCurrency(riskReduction.riskReduced)}`
          : 'Compliance Progress This Month',
        narrative: mode === 'founder'
          ? `Auditvia fixed ${formatNumber(violationsFixed)} accessibility ${violationsFixed === 1 ? 'issue' : 'issues'} this month, reducing your estimated legal exposure by ${formatCurrency(riskReduction.riskReduced)}. Your compliance score improved by ${scoreImprovement}% to ${kpiData.avg_score_30d.toFixed(1)}%. ${currentViolations > 0 ? `${formatNumber(currentViolations)} issues remaining — estimated ${formatCurrency(riskReduction.currentRisk)} in potential legal risk.` : 'Your site is now fully compliant with minimal legal risk!'}`
          : `${formatNumber(violationsFixed)} violations remediated this period. Legal risk exposure reduced by ${formatCurrency(riskReduction.riskReduced)} (based on industry settlement data). Current compliance score: ${kpiData.avg_score_30d.toFixed(1)}%. Remaining risk: ${formatCurrency(riskReduction.currentRisk)} across ${currentViolations} violations.`,
        metrics: [
          { label: 'Legal Exposure Reduced', value: formatCurrency(riskReduction.riskReduced) },
          { label: 'Remaining Risk', value: formatCurrency(riskReduction.currentRisk) },
          { label: 'Compliance Score', value: kpiData.avg_score_30d.toFixed(1) + '%', change: scoreImprovement > 0 ? '+' + scoreImprovement + '%' : undefined }
        ],
        actions: currentViolations > 0 ? [
          { label: mode === 'founder' ? 'Reduce Remaining Risk' : 'View Violations', action: 'view', icon: Zap, primary: true },
          { label: 'Create GitHub Issues', action: 'github', icon: Github }
        ] : undefined
      })
    }

    // Insight 2: Critical Risk Status
    if (currentCritical > 0) {
      generated.push({
        id: 'critical-risk',
        type: 'warning',
        title: 'High-Priority Risk Area',
        narrative: mode === 'founder'
          ? `You have ${formatNumber(currentCritical)} critical accessibility ${currentCritical === 1 ? 'issue' : 'issues'} that pose immediate legal risk. These are typically the easiest to fix and have the highest impact. Our AI can automatically remediate many of these.`
          : `${formatNumber(currentCritical)} critical violations detected (WCAG Level A failures). Estimated legal exposure: ${formatCurrency(currentCritical * 50000)}. Priority remediation recommended.`,
        metrics: [
          { label: 'Critical Issues', value: formatNumber(currentCritical) },
          { label: 'Estimated Risk', value: formatCurrency(currentCritical * 50000) }
        ],
        actions: [
          { label: 'Auto-Fix Critical Issues', action: 'fix', icon: Zap, primary: true },
          { label: 'Email Report to Team', action: 'email', icon: Mail }
        ]
      })
    }

    // Insight 3: Top Issue Type (Copilot-style specific recommendation)
    if (topRules && topRules.length > 0) {
      const topRule = topRules[0]
      const scoreImpact = Math.round((topRule.violation_count / (currentViolations || 1)) * 15) // Estimate score gain
      const riskReduced = topRule.impact === 'critical' 
        ? topRule.violation_count * RESEARCH_BASED_WEIGHTS.critical
        : topRule.impact === 'serious'
        ? topRule.violation_count * RESEARCH_BASED_WEIGHTS.serious
        : topRule.violation_count * RESEARCH_BASED_WEIGHTS.moderate
      
      const complianceUnlock = kpiData.avg_score_30d + scoreImpact
      
      generated.push({
        id: 'top-issue',
        type: 'action',
        title: mode === 'founder' 
          ? `Fix ${topRule.rule === 'color-contrast' ? 'color contrast' : topRule.rule === 'image-alt' ? 'image alt text' : topRule.description.toLowerCase()}: +${scoreImpact}% score gain`
          : `Resolve ${topRule.violation_count} ${topRule.rule} violations: unlock ${complianceUnlock.toFixed(0)}% compliance`,
        narrative: mode === 'founder'
          ? `${topRule.description} appears ${formatNumber(topRule.violation_count)} times. Fixing these would boost your compliance score by ${scoreImpact}% and reduce legal exposure by ${formatCurrency(riskReduced)}. ${complianceUnlock >= 80 ? `This would push you past the 80% ADA compliance threshold.` : `You'd reach ${complianceUnlock.toFixed(0)}% compliance.`}`
          : `Rule: ${topRule.rule} | Impact: ${topRule.impact} | Occurrences: ${formatNumber(topRule.violation_count)} | Est. risk reduction: ${formatCurrency(riskReduced)}. Bulk remediation would unlock ${complianceUnlock.toFixed(0)}% compliance (${scoreImpact}pt gain).`,
        metrics: [
          { label: 'Score Gain', value: '+' + scoreImpact + '%' },
          { label: 'Risk Reduced', value: formatCurrency(riskReduced) },
          { label: 'Unlock', value: complianceUnlock.toFixed(0) + '% compliance' }
        ],
        actions: [
          { label: mode === 'founder' ? `Fix ${topRule.violation_count} Issues` : 'Bulk Remediate', action: 'fix', icon: Zap, primary: true },
          { label: 'View Details', action: 'view', icon: ArrowRight }
        ]
      })
    }

    // Insight 3b: Second Top Issue (if available - for variety)
    if (topRules && topRules.length > 1 && currentViolations > topRules[0].violation_count) {
      const secondRule = topRules[1]
      const scoreImpact = Math.round((secondRule.violation_count / (currentViolations || 1)) * 12)
      const riskReduced = secondRule.impact === 'critical' 
        ? secondRule.violation_count * RESEARCH_BASED_WEIGHTS.critical
        : secondRule.impact === 'serious'
        ? secondRule.violation_count * RESEARCH_BASED_WEIGHTS.serious
        : secondRule.violation_count * RESEARCH_BASED_WEIGHTS.moderate
      
      generated.push({
        id: 'second-issue',
        type: 'action',
        title: mode === 'founder'
          ? `Also fix ${secondRule.rule === 'button-name' ? 'button labels' : secondRule.rule === 'link-name' ? 'link text' : secondRule.description.toLowerCase()}: +${scoreImpact}% score`
          : `Secondary priority: ${secondRule.violation_count} ${secondRule.rule} violations`,
        narrative: mode === 'founder'
          ? `After addressing the top issue, ${secondRule.description.toLowerCase()} (${formatNumber(secondRule.violation_count)} instances) is your next highest-impact fix. This would add another ${scoreImpact}% to your score and reduce risk by ${formatCurrency(riskReduced)}.`
          : `Rule: ${secondRule.rule} | Occurrences: ${formatNumber(secondRule.violation_count)} | Impact: ${secondRule.impact}. Secondary remediation target after primary violations resolved.`,
        metrics: [
          { label: 'Additional Score', value: '+' + scoreImpact + '%' },
          { label: 'Risk Reduction', value: formatCurrency(riskReduced) },
          { label: 'Occurrences', value: formatNumber(secondRule.violation_count) }
        ],
        actions: [
          { label: 'Fix These Next', action: 'view', icon: Target, primary: true }
        ]
      })
    }

    // Insight 4: Forecast
    const trend = recentTrend.length >= 2 
      ? (recentTrend[recentTrend.length - 1]?.total_violations || 0) - (recentTrend[0]?.total_violations || 0)
      : 0
    const isImproving = trend < 0

    if (isImproving && currentViolations > 0) {
      const daysToCompliance = Math.ceil(currentViolations / Math.abs(trend / 7))
      generated.push({
        id: 'forecast',
        type: 'forecast',
        title: 'Compliance Forecast',
        narrative: mode === 'founder'
          ? `You're making great progress! At your current pace, you'll reach full WCAG AA compliance in approximately ${daysToCompliance} days. Keep up the momentum to stay ahead of legal risks.`
          : `Trend analysis: ${Math.abs(trend)} violations/week reduction rate. Projected full compliance: ${daysToCompliance} days. Current trajectory indicates strong remediation velocity.`,
        metrics: [
          { label: 'Days to Compliance', value: formatNumber(daysToCompliance) },
          { label: 'Weekly Fix Rate', value: formatNumber(Math.abs(trend / 7)) + '/week' }
        ]
      })
    }

    // Insight 5: Time Saved / Automation Value
    if (timeSavedHours > 0) {
      const developerHourlyRate = 75 // Average dev rate
      const costSaved = timeSavedHours * developerHourlyRate

      generated.push({
        id: 'time-saved',
        type: 'success',
        title: mode === 'founder' ? 'Developer Time Saved' : 'Automation Efficiency',
        narrative: mode === 'founder'
          ? `Auditvia's automated scans and AI guidance saved your team approximately ${timeSavedHours} hours this week. That's ${formatCurrency(costSaved)} in developer time that can be spent on building features instead of manually hunting for accessibility issues.`
          : `Automated scanning eliminated ~${timeSavedHours}h of manual accessibility testing. Estimated labor cost savings: ${formatCurrency(costSaved)} (@ $${developerHourlyRate}/hr). ${autoFixableCount} issues remaining are auto-fixable.`,
        metrics: [
          { label: 'Hours Saved', value: formatNumber(timeSavedHours) + 'h' },
          { label: 'Cost Savings', value: formatCurrency(costSaved) },
          { label: 'Auto-Fixable', value: formatNumber(autoFixableCount) }
        ],
        actions: autoFixableCount > 0 ? [
          { label: mode === 'founder' ? 'Auto-Fix Now' : 'Run Auto-Remediation', action: 'fix', icon: Zap, primary: true }
        ] : undefined
      })
    }

    // Insight 6: Weekly Velocity
    if (weeklyFixRate > 1) {
      generated.push({
        id: 'velocity',
        type: 'action',
        title: mode === 'founder' ? 'Momentum Check' : 'Remediation Velocity',
        narrative: mode === 'founder'
          ? `Your team is fixing an average of ${Math.round(weeklyFixRate)} accessibility issues per week. ${weeklyFixRate >= 5 ? "That's excellent momentum! " : ""}Keep this pace going and you'll maintain compliance with minimal effort.`
          : `Current remediation velocity: ${weeklyFixRate.toFixed(1)} violations/week. 30-day trend shows ${totalFixesLast30d > 0 ? 'positive' : 'neutral'} trajectory. ${currentViolations > 0 ? `ETA to zero violations: ${Math.ceil(currentViolations / weeklyFixRate)} weeks.` : 'All violations resolved.'}`,
        metrics: [
          { label: 'Weekly Fix Rate', value: Math.round(weeklyFixRate) + '/week' },
          { label: '30-Day Total', value: formatNumber(totalFixesLast30d) + ' fixed' },
          ...(currentViolations > 0 ? [{ label: 'Time to Zero', value: Math.ceil(currentViolations / weeklyFixRate) + ' weeks' }] : [])
        ]
      })
    }

    // Insight 7: Quick Wins Available (Copilot-style)
    if (currentModerate + currentMinor > 0) {
      const quickWinCount = Math.min(5, currentModerate + currentMinor)
      const scoreImpact = Math.round(quickWinCount * 0.5)
      const timeEstimate = Math.round(quickWinCount * 5)
      const riskReduced = (currentModerate * RESEARCH_BASED_WEIGHTS.moderate) + (currentMinor * RESEARCH_BASED_WEIGHTS.minor)
      
      generated.push({
        id: 'quick-wins',
        type: 'action',
        title: mode === 'founder'
          ? `Complete ${quickWinCount} quick fixes: +${scoreImpact}% score in ${timeEstimate} minutes`
          : `Auto-fix ${quickWinCount} low-effort violations: ${timeEstimate}min effort, +${scoreImpact}pts compliance`,
        narrative: mode === 'founder'
          ? `You have ${quickWinCount} low-effort fixes that take under 5 minutes each. Completing all of them would boost your score by ${scoreImpact}% and reduce legal exposure by ${formatCurrency(riskReduced)}. Our AI can auto-fix these or guide you through each one.`
          : `${quickWinCount} moderate/minor severity violations detected. Total effort: ${timeEstimate}min. Score gain: +${scoreImpact}pts. Risk reduction: ${formatCurrency(riskReduced)}. High ROI for minimal time investment.`,
        metrics: [
          { label: 'Time Required', value: timeEstimate + ' min' },
          { label: 'Score Gain', value: '+' + scoreImpact + '%' },
          { label: 'Risk Reduced', value: formatCurrency(riskReduced) }
        ],
        actions: [
          { label: mode === 'founder' ? 'Auto-Fix All' : 'Run Auto-Remediation', action: 'fix', icon: Zap, primary: true },
          { label: 'Show Me Each Fix', action: 'view', icon: Target }
        ]
      })
    }

    // Insight 8: Critical Risk Alert (if critical issues exist)
    if (currentCritical > 0 && criticalFixed === 0) {
      generated.push({
        id: 'critical-alert',
        type: 'warning',
        title: 'Immediate Action Required',
        narrative: mode === 'founder'
          ? `⚠️ You have ${formatNumber(currentCritical)} critical accessibility ${currentCritical === 1 ? 'issue' : 'issues'} that could result in legal exposure. These violate WCAG Level A standards and should be prioritized immediately. The estimated legal risk is ${formatCurrency(currentCritical * 75000)}.`
          : `${formatNumber(currentCritical)} WCAG Level A violations (critical severity). Legal risk exposure: ${formatCurrency(currentCritical * 75000)}. These failures make content inaccessible to users with disabilities. Immediate remediation recommended.`,
        metrics: [
          { label: 'Critical Issues', value: formatNumber(currentCritical) },
          { label: 'Legal Risk', value: formatCurrency(currentCritical * 75000) },
          { label: 'Priority', value: 'Urgent' }
        ],
        actions: [
          { label: 'View Critical Issues', action: 'view', icon: AlertTriangle, primary: true },
          { label: 'Email to Team', action: 'email', icon: Mail }
        ]
      })
    }

    // Insight 9: Benchmark
    const industryAvg = 78 // Mock - would come from aggregated data
    const topPerformer = 95 // Mock
    const percentile = kpiData.avg_score_30d >= industryAvg 
      ? Math.round(((kpiData.avg_score_30d - industryAvg) / (topPerformer - industryAvg)) * 90 + 10)
      : Math.round((kpiData.avg_score_30d / industryAvg) * 50)

    generated.push({
      id: 'benchmark',
      type: 'benchmark',
      title: 'Industry Benchmark',
      narrative: mode === 'founder'
        ? `Your compliance score of ${kpiData.avg_score_30d.toFixed(1)}% puts you in the top ${100 - percentile}% of organizations in your industry. ${kpiData.avg_score_30d >= industryAvg ? "You're ahead of the curve and exceeding industry standards!" : "You're making progress toward industry leaders."}`
        : `Compliance score: ${kpiData.avg_score_30d.toFixed(1)}% (Industry avg: ${industryAvg}%, Top performer: ${topPerformer}%). Percentile ranking: ${percentile}th. ${kpiData.avg_score_30d >= topPerformer ? 'Best-in-class performance.' : 'Gap to top performer: ' + (topPerformer - kpiData.avg_score_30d).toFixed(1) + 'pts.'}`,
      metrics: [
        { label: 'Your Score', value: kpiData.avg_score_30d.toFixed(1) + '%' },
        { label: 'Industry Avg', value: industryAvg + '%' },
        { label: 'Top Performer', value: topPerformer + '%' },
        { label: 'Percentile', value: percentile + 'th' }
      ]
    })

    // Insight 10: Monitoring Status (if multiple sites)
    if (kpiData.total_sites > 1) {
      const scansPerSite = kpiData.total_scans_30d / kpiData.total_sites
      generated.push({
        id: 'monitoring',
        type: 'action',
        title: mode === 'founder' ? 'Monitoring Health' : 'Coverage Analytics',
        narrative: mode === 'founder'
          ? `Auditvia is monitoring ${formatNumber(kpiData.total_sites)} sites for you, with an average of ${scansPerSite.toFixed(1)} scans per site this month. ${scansPerSite >= 4 ? 'Your monitoring coverage is excellent — issues are caught early.' : 'Consider increasing scan frequency to catch issues faster.'}`
          : `${formatNumber(kpiData.total_sites)} sites under continuous monitoring. Average scan frequency: ${scansPerSite.toFixed(1)} scans/site/30d. Total scans this period: ${formatNumber(kpiData.total_scans_30d)}. ${scansPerSite >= 4 ? 'Scan cadence meets compliance monitoring best practices.' : 'Recommend weekly scans for optimal coverage.'}`,
        metrics: [
          { label: 'Sites Monitored', value: formatNumber(kpiData.total_sites) },
          { label: 'Scans (30d)', value: formatNumber(kpiData.total_scans_30d) },
          { label: 'Avg per Site', value: scansPerSite.toFixed(1) }
        ],
        actions: scansPerSite < 4 ? [
          { label: 'Schedule More Scans', action: 'view', icon: Clock, primary: true }
        ] : undefined
      })
    }

    return generated
  }, [kpiData, trendData, topRules, mode])

  const handleAction = (action: string, insightId: string) => {
    console.log('Action:', action, 'Insight:', insightId)
    
    switch (action) {
      case 'fix':
        // Would trigger auto-fix flow
        router.push('/dashboard/violations')
        break
      case 'github':
        // Would open GitHub issue creation
        router.push('/dashboard/violations?action=create-issues')
        break
      case 'email':
        // Would open email modal
        console.log('Email modal')
        break
      case 'view':
        router.push('/dashboard/violations')
        break
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded-lg" />
            <div className="h-64 bg-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle2
      case 'warning': return AlertTriangle
      case 'action': return Target
      case 'forecast': return TrendingUp
      case 'benchmark': return Award
      default: return Shield
    }
  }

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50'
      case 'warning': return 'border-orange-200 bg-orange-50'
      case 'action': return 'border-blue-200 bg-blue-50'
      case 'forecast': return 'border-purple-200 bg-purple-50'
      case 'benchmark': return 'border-gray-200 bg-white'
      default: return 'border-gray-200 bg-white'
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600'
      case 'warning': return 'text-orange-600'
      case 'action': return 'text-blue-600'
      case 'forecast': return 'text-purple-600'
      case 'benchmark': return 'text-gray-600'
      default: return 'text-gray-600'
    }
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
                  Insights Hub
                </h1>
              </div>
              <p className="text-sm text-gray-600">
                AI-powered compliance intelligence and suggested next steps
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
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
                type="button"
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
          {kpiData && (
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Compliance Score</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {kpiData.avg_score_30d.toFixed(1)}%
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Open Issues</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {formatNumber(kpiData.total_violations_30d)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Sites Monitored</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {formatNumber(kpiData.total_sites)}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Scans (30d)</span>
                </div>
                <div className="text-2xl font-semibold text-gray-900">
                  {formatNumber(kpiData.total_scans_30d)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Risk Trajectory Chart */}
      {trendData && trendData.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 pt-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  Legal Risk Trajectory
                </h2>
                <p className="text-sm text-gray-600">
                  Estimated legal exposure over the last 30 days
                </p>
              </div>
              <div className="flex items-center gap-4">
                {(() => {
                  const currentRisk = trendData[trendData.length - 1]
                  const previousRisk = trendData[0]
                  const currentTotal = (currentRisk?.critical_count || 0) * RESEARCH_BASED_WEIGHTS.critical +
                    (currentRisk?.serious_count || 0) * RESEARCH_BASED_WEIGHTS.serious +
                    (currentRisk?.moderate_count || 0) * RESEARCH_BASED_WEIGHTS.moderate +
                    (currentRisk?.minor_count || 0) * RESEARCH_BASED_WEIGHTS.minor
                  const previousTotal = (previousRisk?.critical_count || 0) * RESEARCH_BASED_WEIGHTS.critical +
                    (previousRisk?.serious_count || 0) * RESEARCH_BASED_WEIGHTS.serious +
                    (previousRisk?.moderate_count || 0) * RESEARCH_BASED_WEIGHTS.moderate +
                    (previousRisk?.minor_count || 0) * RESEARCH_BASED_WEIGHTS.minor
                  const riskChange = previousTotal - currentTotal
                  const riskChangePercent = previousTotal > 0 ? ((riskChange / previousTotal) * 100).toFixed(1) : '0'
                  
                  return (
                    <>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(currentTotal)}
                        </div>
                        <div className="text-xs text-gray-500">Current Exposure</div>
                      </div>
                      {riskChange !== 0 && (
                        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                          riskChange > 0 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {riskChange > 0 ? (
                            <>
                              <TrendingDown className="w-4 h-4" />
                              -{riskChangePercent}%
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-4 h-4" />
                              +{Math.abs(parseFloat(riskChangePercent))}%
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Simple Trend Line Visualization */}
            <div className="relative h-32">
              <svg className="w-full h-full" preserveAspectRatio="none">
                {/* Calculate points for trend line */}
                {(() => {
                  const points = trendData.map((day) => {
                    const riskValue = (day.critical_count || 0) * RESEARCH_BASED_WEIGHTS.critical +
                      (day.serious_count || 0) * RESEARCH_BASED_WEIGHTS.serious +
                      (day.moderate_count || 0) * RESEARCH_BASED_WEIGHTS.moderate +
                      (day.minor_count || 0) * RESEARCH_BASED_WEIGHTS.minor
                    return riskValue
                  })

                  const maxRisk = Math.max(...points, 1)
                  const minRisk = Math.min(...points)
                  const range = maxRisk - minRisk || 1

                  const pathPoints = points.map((risk, idx) => {
                    const x = (idx / (points.length - 1)) * 100
                    const y = 100 - ((risk - minRisk) / range) * 80 - 10 // 10% padding
                    return `${x},${y}`
                  }).join(' ')
                  
                  const areaPoints = `0,100 ${pathPoints} 100,100`
                  
                  return (
                    <>
                      {/* Area gradient */}
                      <defs>
                        <linearGradient id="riskGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <polygon
                        points={areaPoints}
                        fill="url(#riskGradient)"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Trend line */}
                      <polyline
                        points={pathPoints}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                    </>
                  )
                })()}
              </svg>
              
              {/* X-axis labels */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 mt-2">
                <span>30 days ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* Risk breakdown */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
              {(() => {
                const current = trendData[trendData.length - 1]
                return (
                  <>
                    <div className="text-center">
                      <div className="text-sm font-medium text-red-600 mb-1">
                        {formatCurrency((current?.critical_count || 0) * RESEARCH_BASED_WEIGHTS.critical)}
                      </div>
                      <div className="text-xs text-gray-500">Critical Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-orange-600 mb-1">
                        {formatCurrency((current?.serious_count || 0) * RESEARCH_BASED_WEIGHTS.serious)}
                      </div>
                      <div className="text-xs text-gray-500">Serious Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-yellow-600 mb-1">
                        {formatCurrency((current?.moderate_count || 0) * RESEARCH_BASED_WEIGHTS.moderate)}
                      </div>
                      <div className="text-xs text-gray-500">Moderate Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-600 mb-1">
                        {formatCurrency((current?.minor_count || 0) * RESEARCH_BASED_WEIGHTS.minor)}
                      </div>
                      <div className="text-xs text-gray-500">Minor Risk</div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Insights Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                AI Suggested Next Steps
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              {insights.length} actionable {insights.length === 1 ? 'recommendation' : 'recommendations'} to improve compliance and reduce risk
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Updated just now • {mode === 'founder' ? 'Business View' : 'Technical View'}
          </div>
        </div>

        {/* Insights Grid - Mix of full-width and 2-column */}
        <div className="space-y-4">
          {insights.map((insight, index) => {
            const Icon = getInsightIcon(insight.type)
            const insightStyle = getInsightStyle(insight.type)
            const iconColor = getIconColor(insight.type)
            
            // First 2 insights are full-width, then alternate between full and half
            const isFullWidth = index < 2 || (index - 2) % 3 === 0

            return (
              <div
                key={insight.id}
                className={`rounded-lg border p-6 ${insightStyle} ${
                  isFullWidth ? '' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {insight.title}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/50 text-gray-600 font-medium">
                        {insight.type === 'success' ? '✓ Progress' :
                         insight.type === 'warning' ? '⚠ Alert' :
                         insight.type === 'action' ? '→ Action' :
                         insight.type === 'forecast' ? '↗ Forecast' :
                         '◆ Benchmark'}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed text-[15px]">
                      {insight.narrative}
                    </p>
                  </div>
                </div>

                {/* Metrics */}
                {insight.metrics && insight.metrics.length > 0 && (
                  <div className="flex items-center gap-6 mb-4 ml-14 flex-wrap">
                    {insight.metrics.map((metric, idx) => (
                      <div key={idx} className="flex items-baseline gap-2">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">{metric.label}:</span>
                        <span className="text-sm font-semibold text-gray-900">{metric.value}</span>
                        {metric.change && (
                          <span className={`text-xs font-medium ${
                            metric.change.startsWith('+') ? 'text-green-600' : 
                            metric.change.startsWith('-') ? 'text-red-600' : 
                            'text-gray-600'
                          }`}>
                            {metric.change}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                {insight.actions && insight.actions.length > 0 && (
                  <div className="flex items-center gap-3 ml-14 flex-wrap">
                    {insight.actions.map((action, idx) => {
                      const ActionIcon = action.icon
                      return (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleAction(action.action, insight.id)}
                          className={`
                            inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                            ${action.primary
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400'
                            }
                          `}
                        >
                          <ActionIcon className="w-4 h-4" />
                          {action.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {insights.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No insights yet
            </h3>
            <p className="text-gray-600 mb-6">
              Run your first scan to start receiving AI-powered compliance insights
            </p>
            <button
              type="button"
              onClick={() => router.push('/dashboard/sites')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Run Your First Scan
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


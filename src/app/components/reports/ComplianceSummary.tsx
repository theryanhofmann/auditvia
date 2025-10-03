'use client'

import { useEffect, useState } from 'react'
import { FileText, Calendar, TrendingUp, Shield } from 'lucide-react'
import { formatNumber, formatCurrency } from '@/lib/reports-utils'
import { RiskDisclaimer } from '@/app/components/ui/RiskDisclaimer'
import type { KPIData, TrendDataPoint } from '@/types/reports'

interface ComplianceSummaryProps {
  kpiData: KPIData | null
  trendData: TrendDataPoint[] | null
  timeRange: string
}

export function ComplianceSummary({ kpiData, trendData, timeRange }: ComplianceSummaryProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (!kpiData || !trendData) return

    // Generate narrative summary
    const totalScans = kpiData.total_scans_30d
    const totalSites = kpiData.total_sites
    const violations = kpiData.total_violations_30d
    const score = kpiData.avg_score_30d
    
    // Calculate fixes (simplified)
    const recentViolations = trendData.slice(-7).map(d => d.total_violations)
    const violationsFixed = recentViolations.length >= 2 
      ? Math.max(0, recentViolations[0] - recentViolations[recentViolations.length - 1])
      : 0
    
    // Calculate risk reduced (using research-based average)
    // Assuming mixed severity, use weighted average: ~$17k per violation
    const riskReduced = violationsFixed * 17000 // Research-based weighted average

    // Generate narrative
    const narratives = [
      `Auditvia scanned ${formatNumber(totalSites)} ${totalSites === 1 ? 'site' : 'sites'} this period, running ${formatNumber(totalScans)} ${totalScans === 1 ? 'audit' : 'audits'}.`,
      violations > 0 
        ? `We detected ${formatNumber(violations)} accessibility ${violations === 1 ? 'issue' : 'issues'} across your monitored sites.`
        : `Great news! No accessibility issues detected in your latest scans.`,
      violationsFixed > 0
        ? `Your team resolved ${formatNumber(violationsFixed)} ${violationsFixed === 1 ? 'issue' : 'issues'}, reducing potential legal risk by approximately ${formatCurrency(riskReduced)}.`
        : ``,
      score >= 90
        ? `With an average score of ${score.toFixed(1)}%, you're maintaining strong WCAG compliance.`
        : score >= 70
        ? `Your current average score is ${score.toFixed(1)}%. Focus on critical and serious violations to reach AA compliance.`
        : `Your score of ${score.toFixed(1)}% indicates room for improvement. Prioritize systematic fixes to boost compliance.`
    ].filter(Boolean).join(' ')

    // Typing animation
    setIsTyping(true)
    let currentIndex = 0
    const typingInterval = setInterval(() => {
      if (currentIndex < narratives.length) {
        setDisplayedText(narratives.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        setIsTyping(false)
        clearInterval(typingInterval)
      }
    }, 15)

    return () => clearInterval(typingInterval)
  }, [kpiData, trendData, timeRange])

  if (!kpiData || !trendData) {
    return null
  }

  const score = kpiData.avg_score_30d
  const getScoreColor = () => {
    if (score >= 90) return 'text-emerald-600'
    if (score >= 70) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm mb-8 relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl" />
      
      <div className="relative">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Compliance Summary</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}</span>
          </div>
        </div>

        {/* Narrative text with typing effect */}
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 leading-relaxed text-sm mb-4">
            {displayedText}
            {isTyping && <span className="inline-block w-1.5 h-4 bg-blue-600 ml-1 animate-pulse" />}
          </p>
        </div>

        {/* Quick stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className={`w-4 h-4 ${getScoreColor()}`} />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Score</span>
            </div>
            <div className={`text-xl font-semibold ${getScoreColor()}`}>
              {kpiData.avg_score_30d.toFixed(1)}%
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Scans</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatNumber(kpiData.total_scans_30d)}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Issues</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatNumber(kpiData.total_violations_30d)}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-500 uppercase tracking-wide">Sites</span>
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {formatNumber(kpiData.total_sites)}
            </div>
          </div>
        </div>

        {/* Risk Methodology Info */}
        <div className="mt-6">
          <RiskDisclaimer audience="founder" variant="tooltip" />
        </div>
      </div>
    </div>
  )
}

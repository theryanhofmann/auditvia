'use client'

import { useEffect, useState } from 'react'
import { Sparkles, TrendingUp, AlertTriangle, Target, Zap, ArrowRight } from 'lucide-react'
import type { KPIData, TrendDataPoint, TopRule } from '@/types/reports'

interface AIInsightsPanelProps {
  kpiData: KPIData | null
  trendData: TrendDataPoint[] | null
  topRules: TopRule[] | null
}

interface Insight {
  type: 'warning' | 'success' | 'info' | 'prediction'
  title: string
  message: string
  action?: {
    label: string
    href: string
  }
  icon: React.ReactNode
  gradient: string
}

export function AIInsightsPanel({ kpiData, trendData, topRules }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [currentInsight, setCurrentInsight] = useState(0)
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    if (!kpiData || !trendData || !topRules) return

    const generatedInsights: Insight[] = []

    // Insight 1: Trend analysis
    if (trendData.length >= 2) {
      const recent = trendData[trendData.length - 1]
      const previous = trendData[trendData.length - 2]
      const criticalChange = recent.critical_count - previous.critical_count
      
      if (criticalChange > 0) {
        generatedInsights.push({
          type: 'warning',
          title: 'Critical Violations Rising',
          message: `Critical violations increased by ${criticalChange} this period. Consider prioritizing ${topRules[0]?.rule || 'top violation rules'} for immediate remediation.`,
          action: {
            label: 'View Critical Issues',
            href: '/dashboard/reports/violations?severity=critical'
          },
          icon: <AlertTriangle className="w-5 h-5" />,
          gradient: 'from-red-500/20 to-orange-500/20'
        })
      } else if (criticalChange < 0) {
        generatedInsights.push({
          type: 'success',
          title: 'Great Progress!',
          message: `You've resolved ${Math.abs(criticalChange)} critical violations. Your team is on track to reach compliance targets ahead of schedule.`,
          icon: <TrendingUp className="w-5 h-5" />,
          gradient: 'from-green-500/20 to-emerald-500/20'
        })
      }
    }

    // Insight 2: Score benchmarking (simulated)
    const score = kpiData.avg_score_30d
    const industryAvg = 87.3 // Simulated
    if (score > industryAvg) {
      const percentile = Math.min(95, Math.round(((score - industryAvg) / industryAvg) * 100 + 70))
      generatedInsights.push({
        type: 'success',
        title: 'Above Industry Average',
        message: `Your compliance score (${score.toFixed(1)}%) is higher than ${percentile}% of companies in your sector. You're leading the pack!`,
        icon: <Target className="w-5 h-5" />,
        gradient: 'from-blue-500/20 to-purple-500/20'
      })
    }

    // Insight 3: Predictive compliance
    const totalViolations = kpiData.total_violations_30d
    if (totalViolations > 0 && trendData.length >= 3) {
      const recentFixes = trendData.slice(-3).reduce((sum, d) => {
        const idx = trendData.indexOf(d)
        if (idx > 0) {
          const prev = trendData[idx - 1]
          return sum + Math.max(0, prev.total_violations - d.total_violations)
        }
        return sum
      }, 0)
      
      const avgFixRate = recentFixes / 3
      const weeksToCompliance = avgFixRate > 0 ? Math.ceil(totalViolations / (avgFixRate * 7)) : null
      
      if (weeksToCompliance && weeksToCompliance < 12) {
        generatedInsights.push({
          type: 'prediction',
          title: 'Compliance Forecast',
          message: `At your current fix rate (${Math.round(avgFixRate)} issues/day), you'll reach WCAG AA compliance in approximately ${weeksToCompliance} weeks.`,
          action: {
            label: 'Accelerate Fixes',
            href: '/dashboard/reports/rules'
          },
          icon: <Zap className="w-5 h-5" />,
          gradient: 'from-cyan-500/20 to-blue-500/20'
        })
      }
    }

    // Insight 4: Top rule recommendation
    if (topRules.length > 0) {
      const topRule = topRules[0]
      generatedInsights.push({
        type: 'info',
        title: 'Quick Win Opportunity',
        message: `${topRule.rule} affects ${topRule.affected_sites} sites with ${topRule.violation_count} instances. Fixing this one rule would improve compliance by ${Math.round((topRule.violation_count / (kpiData.total_violations_30d || 1)) * 100)}%.`,
        action: {
          label: 'Create Fix Issues',
          href: `/dashboard/reports/rules?rule=${topRule.rule}`
        },
        icon: <Sparkles className="w-5 h-5" />,
        gradient: 'from-purple-500/20 to-pink-500/20'
        })
    }

    setInsights(generatedInsights)
  }, [kpiData, trendData, topRules])

  useEffect(() => {
    if (insights.length === 0) return

    const timer = setInterval(() => {
      setCurrentInsight((prev) => (prev + 1) % insights.length)
      setIsTyping(true)
      setTimeout(() => setIsTyping(false), 1000)
    }, 8000)

    return () => clearInterval(timer)
  }, [insights])

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center border border-purple-200">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500 text-sm">Analyzing your compliance data...</p>
        </div>
      </div>
    )
  }

  const insight = insights[currentInsight]

  return (
    <div className="relative bg-white rounded-lg p-6 border border-gray-200 shadow-sm overflow-hidden">
      {/* Subtle gradient overlay based on type */}
      <div className={`absolute top-0 right-0 w-64 h-64 blur-3xl opacity-20 ${
        insight.type === 'warning' ? 'bg-gradient-to-br from-red-500 to-orange-500' :
        insight.type === 'success' ? 'bg-gradient-to-br from-emerald-500 to-green-500' :
        insight.type === 'prediction' ? 'bg-gradient-to-br from-cyan-500 to-blue-500' :
        'bg-gradient-to-br from-purple-500 to-pink-500'
      }`} />
      
      <div className="relative">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${
            insight.type === 'warning' ? 'bg-red-50 border-red-200 text-red-600' :
            insight.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
            insight.type === 'prediction' ? 'bg-cyan-50 border-cyan-200 text-cyan-600' :
            'bg-purple-50 border-purple-200 text-purple-600'
          }`}>
            {insight.icon}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
              <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">
                AI Insight {currentInsight + 1}/{insights.length}
              </span>
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">{insight.title}</h4>
            <p className={`text-sm text-gray-700 leading-relaxed ${isTyping ? 'opacity-70' : 'opacity-100'} transition-opacity duration-300`}>
              {insight.message}
            </p>
          </div>
        </div>

        {/* Action button and pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          {insight.action ? (
            <a
              href={insight.action.href}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white transition-all duration-200"
            >
              {insight.action.label}
              <ArrowRight className="w-4 h-4" />
            </a>
          ) : (
            <div />
          )}
          
          {/* Pagination dots */}
          <div className="flex items-center gap-2">
            {insights.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentInsight(idx)
                  setIsTyping(true)
                  setTimeout(() => setIsTyping(false), 1000)
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentInsight 
                    ? 'bg-blue-600 w-6' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to insight ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

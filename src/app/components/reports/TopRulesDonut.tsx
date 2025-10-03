'use client'

import { useState, useEffect } from 'react'
import { Download, ExternalLink, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { exportToCSV, formatNumber } from '@/lib/reports-utils'
import type { TopRule } from '@/types/reports'

interface TopRulesDonutProps {
  data: TopRule[] | null
  loading: boolean
  onExport?: () => void
}

const SEVERITY_COLORS = {
  critical: '#DC2626',
  serious: '#EA580C',
  moderate: '#F59E0B',
  minor: '#3B82F6'
}

export function TopRulesDonut({ data, loading, onExport }: TopRulesDonutProps) {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null)
  const [selectedRule, setSelectedRule] = useState<TopRule | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 400)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="h-80 bg-gray-100 rounded"></div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Violation Rules</h3>
        <div className="h-80 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-gray-600 mb-2 text-center">No violations detected</p>
          <p className="text-sm text-gray-600 text-center max-w-xs">
            Great job! Keep monitoring regularly to maintain compliance.
          </p>
        </div>
      </div>
    )
  }

  const handleExport = () => {
    if (!data) return
    exportToCSV(data, 'top-rules', [
      { key: 'rule', label: 'Rule ID' },
      { key: 'impact', label: 'Severity' },
      { key: 'violation_count', label: 'Count' },
      { key: 'affected_sites', label: 'Affected Sites' },
      { key: 'github_issues_created', label: 'GitHub Issues' },
      { key: 'description', label: 'Description' }
    ])
    onExport?.()
  }

  const topRules = data.slice(0, 8)
  const totalViolations = topRules.reduce((sum, rule) => sum + rule.violation_count, 0)
  
  // Calculate donut segments
  let currentAngle = 0
  const segments = topRules.map((rule, index) => {
    const percentage = (rule.violation_count / totalViolations) * 100
    const angle = (percentage / 100) * 360
    const startAngle = currentAngle
    currentAngle += angle
    
    return {
      rule,
      percentage,
      startAngle,
      endAngle: currentAngle,
      index
    }
  })

  const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
    const rad = (angle - 90) * Math.PI / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad)
    }
  }

  const createArc = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, radius, endAngle)
    const end = polarToCartesian(cx, cy, radius, startAngle)
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1'
    
    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`
    ].join(' ')
  }

  const displayRule = selectedRule || (hoveredSegment !== null ? segments[hoveredSegment].rule : topRules[0])

  return (
    <div className={`bg-white rounded-lg p-6 border border-gray-200 shadow-sm transition-all duration-500 ${
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Top Violation Rules</h3>
          <p className="text-sm text-gray-500">Click segments to explore</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
          aria-label="Export top rules data to CSV"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg width="280" height="280" viewBox="0 0 280 280">
              <defs>
                {segments.map((segment, idx) => (
                  <filter key={idx} id={`glow-${idx}`}>
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                ))}
              </defs>
              
              {segments.map((segment, idx) => {
                const isHovered = hoveredSegment === idx
                const isSelected = selectedRule?.rule === segment.rule.rule
                const outerRadius = isHovered || isSelected ? 110 : 100
                const innerRadius = 60
                
                const outerArc = createArc(140, 140, outerRadius, segment.startAngle, segment.endAngle)
                const innerStart = polarToCartesian(140, 140, innerRadius, segment.endAngle)
                const innerEnd = polarToCartesian(140, 140, innerRadius, segment.startAngle)
                
                const pathData = `${outerArc} L ${innerStart.x} ${innerStart.y} A ${innerRadius} ${innerRadius} 0 ${segment.endAngle - segment.startAngle > 180 ? 1 : 0} 1 ${innerEnd.x} ${innerEnd.y} Z`
                
                return (
                  <path
                    key={idx}
                    d={pathData}
                    fill={SEVERITY_COLORS[segment.rule.impact]}
                    opacity={isHovered || isSelected ? 1 : 0.7}
                    className="cursor-pointer transition-all duration-300"
                    onMouseEnter={() => setHoveredSegment(idx)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => setSelectedRule(segment.rule)}
                    filter={isHovered || isSelected ? `url(#glow-${idx})` : undefined}
                  />
                )
              })}
              
              {/* Center text */}
              <text
                x="140"
                y="130"
                textAnchor="middle"
                className="text-3xl font-bold fill-white"
              >
                {formatNumber(totalViolations)}
              </text>
              <text
                x="140"
                y="150"
                textAnchor="middle"
                className="text-xs fill-gray-400"
              >
                Total Issues
              </text>
            </svg>
          </div>
        </div>

        {/* Rule Details */}
        <div className="flex flex-col justify-center space-y-4">
          {displayRule && (
            <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-start gap-3 mb-3">
                <div 
                  className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ backgroundColor: SEVERITY_COLORS[displayRule.impact] }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{displayRule.rule}</h4>
                  <p className="text-xs text-gray-600 line-clamp-2">{displayRule.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <div className="text-xs text-gray-500">Count</div>
                  <div className="text-lg font-bold text-gray-900">{formatNumber(displayRule.violation_count)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Sites</div>
                  <div className="text-lg font-bold text-gray-900">{displayRule.affected_sites}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Issues</div>
                  <div className="text-lg font-bold text-emerald-600">{displayRule.github_issues_created}</div>
                </div>
              </div>
              
              {displayRule.help_url && (
                <a
                  href={displayRule.help_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-300 transition-colors"
                >
                  Learn more
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
          
          {/* Quick legend */}
          <div className="space-y-2">
            {topRules.slice(0, 5).map((rule, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedRule(rule)}
                onMouseEnter={() => setHoveredSegment(idx)}
                onMouseLeave={() => setHoveredSegment(null)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                  selectedRule?.rule === rule.rule || hoveredSegment === idx
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLORS[rule.impact] }}
                  />
                  <span className="text-xs text-gray-600 truncate">{rule.rule}</span>
                </div>
                <span className="text-xs font-semibold text-gray-900">{formatNumber(rule.violation_count)}</span>
              </button>
            ))}
          </div>
          
          {data.length > 5 && (
            <Link
              href="/dashboard/reports/rules"
              className="text-xs text-blue-600 hover:text-blue-300 transition-colors inline-flex items-center gap-1"
            >
              View all {data.length} rules
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

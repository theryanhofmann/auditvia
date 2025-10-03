'use client'

import { useState } from 'react'
import { 
  ChevronDown, 
  ChevronRight,
  MousePointerClick,
  Type,
  Menu,
  Image as ImageIcon,
  Eye,
  Grid3x3,
  Table2,
  AlertCircle,
  Info,
  ArrowRight
} from 'lucide-react'

interface CategoryCardProps {
  category: string
  displayName: string
  score: number
  issueCount: number
  criticalCount: number
  humanImpact: string
  issues: any[]
  onIssueClick: (issue: any) => void
}

const categoryIcons: Record<string, any> = {
  clickables: MousePointerClick,
  titles: Type,
  menus: Menu,
  graphics: ImageIcon,
  contrast: Eye,
  carousels: Grid3x3,
  tables: Table2,
  general: AlertCircle
}

const disabilityImpacts: Record<string, string[]> = {
  clickables: ['Keyboard users', 'Screen reader users', 'Motor impairments'],
  titles: ['Screen reader users', 'Cognitive disabilities'],
  menus: ['Keyboard users', 'Screen reader users'],
  graphics: ['Blind users', 'Low vision users'],
  contrast: ['Low vision', 'Color blindness'],
  carousels: ['Screen reader users', 'Keyboard users'],
  tables: ['Screen reader users'],
  general: ['All users with disabilities']
}

export function CategoryCard({
  category,
  displayName,
  score,
  issueCount,
  criticalCount,
  humanImpact,
  issues,
  onIssueClick
}: CategoryCardProps) {
  console.log('📦 [CategoryCard] RENDERING:', {
    category,
    displayName,
    issueCount,
    criticalCount,
    score
  })

  const [isExpanded, setIsExpanded] = useState(criticalCount > 0)
  const [showTooltip, setShowTooltip] = useState(false)

  const Icon = categoryIcons[category] || AlertCircle
  const impacts = disabilityImpacts[category] || []

  // Severity dot styling (small dots instead of badges)
  const getSeverityDot = (severity: string) => {
    const styles = {
      critical: 'bg-red-500',
      serious: 'bg-orange-500',
      moderate: 'bg-yellow-500',
      minor: 'bg-gray-400'
    }
    return styles[severity as keyof typeof styles] || styles.minor
  }

  // Severity badge styling
  const getSeverityBadge = (severity: string) => {
    const styles = {
      critical: 'bg-red-50 text-red-700 border-red-200',
      serious: 'bg-orange-50 text-orange-700 border-orange-200',
      moderate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      minor: 'bg-gray-50 text-gray-600 border-gray-200'
    }
    return styles[severity as keyof typeof styles] || styles.minor
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-all duration-200">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
      >
        {/* Icon Container - Smaller icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-200">
          <Icon className="w-4 h-4 text-gray-600" />
        </div>

        {/* Category Info */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900">{displayName}</h3>
            
            {/* Human Impact Info Icon */}
            <div className="relative">
              <div
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowTooltip(!showTooltip)
                }}
                className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 text-gray-500 hover:text-blue-600" />
              </div>
              
              {showTooltip && (
                <div className="absolute left-0 top-7 z-50 w-80 bg-gray-900 text-white text-sm rounded-lg p-4 shadow-xl">
                  <div className="font-semibold text-white mb-2">Who This Affects</div>
                  <p className="text-gray-300 text-sm mb-3 leading-relaxed">{humanImpact}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {impacts.map((impact, idx) => (
                      <span 
                        key={idx} 
                        className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-200"
                      >
                        {impact}
                      </span>
                    ))}
                  </div>
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">
              {issueCount} {issueCount === 1 ? 'issue' : 'issues'}
            </span>
            {criticalCount > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1.5 text-red-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  {criticalCount} critical
                </span>
              </>
            )}
          </div>
        </div>

        {/* Expand Icon */}
        <div className="flex-shrink-0 ml-auto">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Issues List */}
      {isExpanded && issues.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="divide-y divide-gray-200">
            {issues.map((issue, idx) => (
              <button
                key={idx}
                onClick={() => onIssueClick(issue)}
                className="w-full px-5 py-4 text-left hover:bg-white transition-colors flex items-start gap-4 group"
              >
                {/* Severity Indicator */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1.5 pt-1">
                  <span className={`
                    w-2 h-2 rounded-full ${getSeverityDot(issue.impact)}
                  `} />
                  <div className="h-full w-px bg-gray-200"></div>
                </div>

                {/* Issue Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 leading-snug">
                      {issue.description || issue.help || 'Accessibility issue detected'}
                    </h4>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Severity Badge */}
                    <span className={`
                      inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border
                      ${getSeverityBadge(issue.impact)}
                    `}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getSeverityDot(issue.impact)}`} />
                      {issue.impact.charAt(0).toUpperCase() + issue.impact.slice(1)}
                    </span>
                    
                    {/* WCAG Reference */}
                    {issue.wcag && issue.wcag.length > 0 && (
                      <span className="text-xs text-gray-500">
                        WCAG {issue.wcag.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isExpanded && issues.length === 0 && (
        <div className="px-5 py-8 text-center border-t border-gray-200 bg-gray-50">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mx-auto mb-2">
            <CheckIcon className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600">No issues found in this category</p>
        </div>
      )}
    </div>
  )
}

function CheckIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

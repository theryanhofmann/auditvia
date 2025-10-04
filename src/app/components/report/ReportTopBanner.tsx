'use client'

import { Check, AlertTriangle, XCircle, ExternalLink, Shield } from 'lucide-react'
import type { VerdictResult } from '@/lib/verdict-system'

interface ReportTopBannerProps {
  verdict: VerdictResult
  siteName: string
  siteUrl: string
  totalIssues: number
  criticalCount: number
  seriousCount: number
  moderateCount: number
  minorCount: number
  scanDate: string
  platform?: string
  platformConfidence?: number
}

export function ReportTopBanner({
  verdict,
  siteName,
  siteUrl,
  totalIssues,
  criticalCount,
  seriousCount,
  moderateCount,
  minorCount,
  scanDate,
  platform,
  platformConfidence
}: ReportTopBannerProps) {
  console.log('🏆 [ReportTopBanner] RENDERING:', {
    verdict: verdict.status,
    title: verdict.title,
    siteName,
    totalIssues,
    criticalCount,
    seriousCount
  })

  const verdictConfig: Record<string, {
    icon: typeof Check | typeof AlertTriangle | typeof XCircle;
    iconColor: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    statusDot: string;
  }> = {
    'compliant': {
      icon: Check,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-900',
      statusDot: 'bg-green-500'
    },
    'at-risk': {
      icon: AlertTriangle,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-900',
      statusDot: 'bg-orange-500'
    },
    'non-compliant': {
      icon: XCircle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-900',
      statusDot: 'bg-red-500'
    }
  }

  const config = verdictConfig[verdict.status]
  const Icon = config.icon

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Row - Site Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-gray-900">{siteName}</h1>
              {platform && platformConfidence && platformConfidence > 0.7 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Check className="w-3 h-3" />
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <a 
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                <span className="max-w-md truncate">{siteUrl}</span>
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              </a>
              <span className="text-sm text-gray-400">•</span>
              <span className="text-sm text-gray-500">
                Scanned {new Date(scanDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>
          
          {/* Compliance Standards Badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <Shield className="w-4 h-4 text-gray-500" />
            <div className="text-sm">
              <span className="font-medium text-gray-900">WCAG 2.2 AA</span>
              <span className="text-gray-400 mx-1.5">•</span>
              <span className="text-gray-600">ADA</span>
            </div>
          </div>
        </div>

        {/* Verdict Card */}
        <div className="grid grid-cols-12 gap-4">
          {/* Main Verdict Panel */}
          <div className="col-span-8">
            <div className={`
              relative overflow-hidden rounded-lg border ${config.borderColor} ${config.bgColor}
              p-6 h-full
            `}>
              <div>
                {/* Status Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-lg
                    bg-white border border-gray-200
                  `}>
                    <Icon className={`w-5 h-5 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className={`text-lg font-semibold ${config.textColor}`}>
                        {verdict.title}
                      </h2>
                      <span className={`
                        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium
                        bg-white ${config.textColor} border border-gray-200
                      `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${config.statusDot}`}></span>
                        {verdict.riskLevel}
                      </span>
                    </div>
                    <p className={`text-sm ${config.textColor} mt-1`}>
                      {verdict.description}
                    </p>
                  </div>
                </div>

                {/* Recommended Actions */}
                {verdict.recommendations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                      Recommended Actions
                    </div>
                    <ul className="space-y-1.5">
                      {verdict.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-gray-400 mt-0.5 flex-shrink-0">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Issue Metrics Panel */}
          <div className="col-span-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6 h-full">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">
                Issue Breakdown
              </div>
              
              <div className="space-y-3">
                {/* Total Issues */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Total Issues</span>
                  <span className="text-2xl font-semibold text-gray-900">{totalIssues}</span>
                </div>

                {/* Critical */}
                {criticalCount > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm text-gray-700">Critical</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">{criticalCount}</span>
                  </div>
                )}

                {/* Serious */}
                {seriousCount > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      <span className="text-sm text-gray-700">Serious</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">{seriousCount}</span>
                  </div>
                )}

                {/* Moderate */}
                {moderateCount > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-sm text-gray-700">Moderate</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">{moderateCount}</span>
                  </div>
                )}

                {/* Minor */}
                {minorCount > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="text-sm text-gray-700">Minor</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">{minorCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

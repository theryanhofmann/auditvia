'use client'

import { useState } from 'react'
import { Info, ExternalLink, X } from 'lucide-react'
import { RISK_SOURCES, LEGAL_DISCLAIMER, getRiskMessaging } from '@/lib/risk-methodology'

interface RiskDisclaimerProps {
  audience?: 'founder' | 'developer' | 'enterprise' | 'investor'
  variant?: 'inline' | 'tooltip' | 'banner' | 'modal'
  showSources?: boolean
}

export function RiskDisclaimer({ 
  audience = 'founder', 
  variant = 'inline',
  showSources = false 
}: RiskDisclaimerProps) {
  const [showFullDisclaimer, setShowFullDisclaimer] = useState(false)
  const messaging = getRiskMessaging(audience)

  if (variant === 'tooltip') {
    return (
      <div className="group relative inline-block">
        <button 
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Risk methodology information"
        >
          <Info className="w-4 h-4" />
        </button>
        
        <div className="invisible group-hover:visible absolute bottom-full right-0 mb-2 w-80 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl z-50">
          <p className="font-medium mb-1">{messaging.title}</p>
          <p className="text-gray-300 mb-2">{messaging.description}</p>
          <p className="text-gray-400 text-xs italic">{messaging.disclaimer}</p>
          
          <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900" />
        </div>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
        <div>
          <p className="font-medium text-gray-900 mb-1">{messaging.title}</p>
          <p className="mb-1">{messaging.description}</p>
          <p className="text-gray-500 italic">{messaging.disclaimer}</p>
          
          {showSources && (
            <button
              onClick={() => setShowFullDisclaimer(!showFullDisclaimer)}
              className="text-blue-600 hover:text-blue-700 font-medium mt-2 flex items-center gap-1"
            >
              {showFullDisclaimer ? 'Hide' : 'View'} methodology & sources
              {showFullDisclaimer ? <X className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'banner') {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">{messaging.title}</h3>
            <p className="text-sm text-blue-800 mb-2">{messaging.description}</p>
            <p className="text-xs text-blue-700 italic">{messaging.disclaimer}</p>
          </div>
        </div>
      </div>
    )
  }

  // Modal variant
  if (showFullDisclaimer) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Risk Calculation Methodology</h2>
            <button
              onClick={() => setShowFullDisclaimer(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Overview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Overview</h3>
              <p className="text-gray-700 leading-relaxed">
                Auditvia estimates financial risk using severity-weighted values derived from industry research. 
                Each violation type is assigned a dollar value based on ADA lawsuit settlement data, 
                professional remediation costs, and legal exposure analysis.
              </p>
            </div>

            {/* Risk Weights */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Risk Values</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-red-900 mb-1">Critical Violations</div>
                  <div className="text-2xl font-bold text-red-700">$50,000</div>
                  <div className="text-xs text-red-600 mt-1">Avg ADA lawsuit settlement: $20k-$100k</div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-orange-900 mb-1">Serious Violations</div>
                  <div className="text-2xl font-bold text-orange-700">$15,000</div>
                  <div className="text-xs text-orange-600 mt-1">Remediation cost + legal risk</div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-yellow-900 mb-1">Moderate Violations</div>
                  <div className="text-2xl font-bold text-yellow-700">$3,000</div>
                  <div className="text-xs text-yellow-600 mt-1">Developer time + QA testing</div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-900 mb-1">Minor Violations</div>
                  <div className="text-2xl font-bold text-gray-700">$500</div>
                  <div className="text-xs text-gray-600 mt-1">Time to fix + testing</div>
                </div>
              </div>
            </div>

            {/* Sources */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Research Sources</h3>
              <div className="space-y-3">
                {RISK_SOURCES.map((source, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">{source.name}</div>
                      <div className="text-sm text-gray-600">{source.citation} ({source.year})</div>
                      {source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline mt-1 inline-block"
                        >
                          View source →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Important Legal Disclaimer
              </h3>
              <div className="text-xs text-yellow-800 space-y-2 leading-relaxed whitespace-pre-line">
                {LEGAL_DISCLAIMER}
              </div>
            </div>

            {/* Enterprise Option */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-blue-900 mb-2">Enterprise Customization</h3>
              <p className="text-sm text-blue-800 mb-3">
                Need to calibrate these values to your organization's actual legal exposure or insurance requirements?
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Contact us about Enterprise plans →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowFullDisclaimer(true)}
      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
    >
      <Info className="w-3 h-3" />
      <span>How is this calculated?</span>
    </button>
  )
}

// Compact version for inline use
export function RiskMethodologyBadge() {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-xs text-gray-600 rounded-full transition-colors"
      >
        <Info className="w-3 h-3" />
        Research-based estimate
      </button>

      {showInfo && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowInfo(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4 z-50 text-left">
            <p className="text-sm text-gray-900 font-medium mb-2">
              Based on Industry Research
            </p>
            <p className="text-xs text-gray-600 mb-3">
              Risk values derived from ADA lawsuit settlement data, remediation cost studies, and legal exposure analysis.
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <div>• Seyfarth Shaw LLP (2023)</div>
              <div>• UsableNet (2023)</div>
              <div>• Deque Systems (2023)</div>
              <div>• DOJ ADA Database (2024)</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


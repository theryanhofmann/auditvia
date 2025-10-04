'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Award, AlertTriangle, Target, ArrowRight, Sparkles } from 'lucide-react'
import { Sparkline } from './Sparkline'
import { DeltaBadge } from './DeltaBadge'
import { focusRing } from './design-tokens'

export interface Insight {
  id: string
  type: 'benchmark' | 'risk' | 'hotspot' | 'forecast'
  title: string
  subtitle: string
  value: string
  delta?: number
  sparklineData?: number[]
  action?: {
    label: string
    onClick: () => void
  }
}

interface InsightCardProps {
  insights: Insight[]
  rotationInterval?: number // ms
  maxVisible?: number
}

const SEEN_INSIGHTS_KEY = 'auditvia_seen_insights'

export function InsightCard({ 
  insights, 
  rotationInterval = 8000,
  maxVisible = 3 
}: InsightCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [seenInsights, setSeenInsights] = useState<Set<string>>(new Set())

  // Load seen insights from session storage
  useEffect(() => {
    const seen = sessionStorage.getItem(SEEN_INSIGHTS_KEY)
    if (seen) {
      setSeenInsights(new Set(JSON.parse(seen)))
    }
  }, [])

  // Filter out insights seen in this session, but always show at least maxVisible
  const availableInsights = insights.filter(i => !seenInsights.has(i.id))
  const displayInsights = availableInsights.length >= maxVisible 
    ? availableInsights 
    : insights

  const visibleInsights = displayInsights.slice(0, maxVisible)

  // Rotate insights
  useEffect(() => {
    if (visibleInsights.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const next = (prev + 1) % visibleInsights.length
        const nextInsight = visibleInsights[next]
        
        // Mark as seen
        const newSeen = new Set(seenInsights)
        newSeen.add(nextInsight.id)
        setSeenInsights(newSeen)
        sessionStorage.setItem(SEEN_INSIGHTS_KEY, JSON.stringify([...newSeen]))
        
        return next
      })
    }, rotationInterval)

    return () => clearInterval(interval)
  }, [visibleInsights, rotationInterval, seenInsights])

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'benchmark': return Award
      case 'risk': return AlertTriangle
      case 'hotspot': return TrendingUp
      case 'forecast': return Target
      default: return Sparkles
    }
  }

  const getBgColor = (type: Insight['type']) => {
    switch (type) {
      case 'benchmark': return 'bg-purple-50 border-purple-200'
      case 'risk': return 'bg-red-50 border-red-200'
      case 'hotspot': return 'bg-amber-50 border-amber-200'
      case 'forecast': return 'bg-blue-50 border-blue-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const getIconColor = (type: Insight['type']) => {
    switch (type) {
      case 'benchmark': return 'text-purple-600 bg-purple-100'
      case 'risk': return 'text-red-600 bg-red-100'
      case 'hotspot': return 'text-amber-600 bg-amber-100'
      case 'forecast': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (visibleInsights.length === 0) return null

  const currentInsight = visibleInsights[currentIndex]
  const Icon = getIcon(currentInsight.type)

  return (
    <div className="relative">
      {/* Rotation indicator dots */}
      {visibleInsights.length > 1 && (
        <div className="absolute -top-2 right-4 flex gap-1.5 z-10">
          {visibleInsights.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`
                w-1.5 h-1.5 rounded-full transition-all duration-200
                ${idx === currentIndex ? 'bg-blue-600 w-4' : 'bg-gray-300 hover:bg-gray-400'}
                ${focusRing}
              `}
              aria-label={`View insight ${idx + 1}`}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentInsight.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className={`
            relative overflow-hidden rounded-lg border
            ${getBgColor(currentInsight.type)}
            p-6 shadow-sm
            hover:shadow-md transition-shadow
          `}
        >
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Icon + Title */}
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${getIconColor(currentInsight.type)}`}>
                  <Icon size={18} strokeWidth={2} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 truncate">
                  {currentInsight.title}
                </h3>
              </div>

              {/* Subtitle */}
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {currentInsight.subtitle}
              </p>

              {/* Value + Delta */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold text-gray-900">
                  {currentInsight.value}
                </span>
                {currentInsight.delta !== undefined && (
                  <DeltaBadge value={currentInsight.delta} size="sm" />
                )}
              </div>

              {/* Action */}
              {currentInsight.action && (
                <button
                  onClick={currentInsight.action.onClick}
                  className={`
                    inline-flex items-center gap-1.5 text-sm font-medium
                    text-blue-600 hover:text-blue-700
                    transition-colors group
                    ${focusRing}
                  `}
                >
                  {currentInsight.action.label}
                  <ArrowRight 
                    size={14} 
                    className="group-hover:translate-x-0.5 transition-transform" 
                  />
                </button>
              )}
            </div>

            {/* Sparkline */}
            {currentInsight.sparklineData && currentInsight.sparklineData.length > 0 && (
              <div className="flex-shrink-0">
                <Sparkline
                  data={currentInsight.sparklineData}
                  width={80}
                  height={48}
                  color="#3b82f6"
                  showArea
                />
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

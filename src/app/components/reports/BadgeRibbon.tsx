'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, TrendingUp, Activity, GitPullRequest, DollarSign, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import { designTokens } from './design-tokens'

interface Badge {
  id: string
  name: string
  description: string
  icon: 'check' | 'trending' | 'activity' | 'git' | 'dollar' | 'shield'
  threshold: number
  metric: 'score' | 'issues_resolved' | 'scans' | 'github_issues' | 'risk_reduced'
}

interface BadgeRibbonProps {
  currentMetrics: {
    score?: number
    issues_resolved?: number
    scans?: number
    github_issues?: number
    risk_reduced?: number
  }
  onBadgeEarned?: (badge: Badge) => void
}

const BADGES: Badge[] = [
  {
    id: 'score_90',
    name: 'AA Compliant',
    description: '90%+ compliance score',
    icon: 'check',
    threshold: 90,
    metric: 'score',
  },
  {
    id: 'issues_50',
    name: '50+ Fixed',
    description: '50 violations resolved',
    icon: 'trending',
    threshold: 50,
    metric: 'issues_resolved',
  },
  {
    id: 'github_first',
    name: 'GitHub Active',
    description: 'Issue tracking enabled',
    icon: 'git',
    threshold: 1,
    metric: 'github_issues',
  },
  {
    id: 'scans_10',
    name: '10+ Scans',
    description: 'Active monitoring',
    icon: 'activity',
    threshold: 10,
    metric: 'scans',
  },
  {
    id: 'risk_10k',
    name: '$10k Reduced',
    description: 'Risk mitigation',
    icon: 'dollar',
    threshold: 10000,
    metric: 'risk_reduced',
  },
]

const EARNED_BADGES_KEY = 'auditvia_earned_badges'

export function BadgeRibbon({ currentMetrics, onBadgeEarned }: BadgeRibbonProps) {
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(new Set())
  const [newlyEarned, setNewlyEarned] = useState<Badge | null>(null)

  // Load earned badges from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(EARNED_BADGES_KEY)
    if (saved) {
      setEarnedBadges(new Set(JSON.parse(saved)))
    }
  }, [])

  // Check for newly earned badges
  useEffect(() => {
    BADGES.forEach(badge => {
      const metricValue = currentMetrics[badge.metric] || 0
      const isEarned = metricValue >= badge.threshold
      const wasEarnedBefore = earnedBadges.has(badge.id)

      if (isEarned && !wasEarnedBefore) {
        // Badge just earned!
        const newEarned = new Set(earnedBadges)
        newEarned.add(badge.id)
        setEarnedBadges(newEarned)
        localStorage.setItem(EARNED_BADGES_KEY, JSON.stringify([...newEarned]))
        
        // Show celebration
        setNewlyEarned(badge)
        onBadgeEarned?.(badge)

        // Clear celebration after 5 seconds
        setTimeout(() => setNewlyEarned(null), 5000)
      }
    })
  }, [currentMetrics, earnedBadges, onBadgeEarned])

  const getIcon = (icon: Badge['icon']) => {
    switch (icon) {
      case 'check': return CheckCircle2
      case 'trending': return TrendingUp
      case 'activity': return Activity
      case 'git': return GitPullRequest
      case 'dollar': return DollarSign
      case 'shield': return Shield
      default: return CheckCircle2
    }
  }

  const earnedBadgesList = BADGES.filter(b => earnedBadges.has(b.id))

  if (earnedBadgesList.length === 0) return null

  return (
    <>
      {/* Professional Badge Bar (light theme) */}
      <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-white rounded-lg border border-gray-200 shadow-sm">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Milestones</span>
        <div className="flex gap-2">
          {earnedBadgesList.map((badge, idx) => {
            const Icon = getIcon(badge.icon)
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative"
              >
                <div 
                  className="
                    w-7 h-7 rounded bg-blue-50 flex items-center justify-center
                    text-blue-600 hover:bg-blue-100
                    transition-colors cursor-pointer
                  "
                  title={badge.name}
                >
                  <Icon size={14} strokeWidth={2} />
                </div>

                {/* Professional Tooltip */}
                <div className="
                  absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                  opacity-0 group-hover:opacity-100
                  pointer-events-none
                  transition-opacity
                  z-50
                ">
                  <div className="bg-gray-900 text-white rounded-md px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                    <div className="font-semibold mb-0.5">{badge.name}</div>
                    <div className="text-gray-300 text-[11px]">{badge.description}</div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Clean System Toast (professional, no emojis) */}
      <AnimatePresence>
        {newlyEarned && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50"
          >
            <div className="
              bg-white border border-gray-200
              rounded-lg p-4 shadow-lg
              max-w-sm
            ">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  {(() => {
                    const Icon = getIcon(newlyEarned.icon)
                    return <Icon size={18} className="text-blue-600" strokeWidth={2} />
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 mb-0.5">
                    {newlyEarned.name}
                  </div>
                  <div className="text-xs text-gray-600">
                    {newlyEarned.description}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

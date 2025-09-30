'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Crown, Loader2, Zap } from 'lucide-react'
import { useTeam } from '@/app/context/TeamContext'
import { toast } from 'sonner'

// Simple cache for team data to avoid repeated API calls
const teamDataCache = new Map<string, any>()

async function getCachedTeamData(teamId: string) {
  // Return cached data if available
  if (teamDataCache.has(teamId)) {
    return teamDataCache.get(teamId)
  }

  // Try to get from localStorage first (for client-side caching)
  const cached = localStorage.getItem(`team_${teamId}`)
  if (cached) {
    try {
      const data = JSON.parse(cached)
      // Check if cache is still fresh (less than 5 minutes old)
      if (Date.now() - data.timestamp < 5 * 60 * 1000) {
        teamDataCache.set(teamId, data.team)
        return data.team
      }
    } catch (error) {
      // Invalid cache, ignore
    }
  }

  return null
}

function setCachedTeamData(teamId: string, teamData: any) {
  teamDataCache.set(teamId, teamData)
  // Also cache in localStorage for persistence across page refreshes
  try {
    localStorage.setItem(`team_${teamId}`, JSON.stringify({
      team: teamData,
      timestamp: Date.now()
    }))
  } catch (error) {
    // localStorage not available or quota exceeded, ignore
  }
}

interface ProUpgradeButtonProps {
  size?: 'default' | 'sm' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
  children?: React.ReactNode
  showIcon?: boolean
}

export function ProUpgradeButton({ 
  size = 'default', 
  variant = 'default',
  className = '',
  children,
  showIcon = true
}: ProUpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { teamId } = useTeam()
  const [teamBillingStatus, setTeamBillingStatus] = useState<string | null>(null)

  useEffect(() => {
    async function checkBillingStatus() {
      if (!teamId) return
      
      try {
        // Use cached team data instead of making API call
        const cachedTeam = await getCachedTeamData(teamId)
        if (cachedTeam) {
          setTeamBillingStatus(cachedTeam.billing_status)
        } else {
          const response = await fetch(`/api/teams/${teamId}`)
          if (response.ok) {
            const team = await response.json()
            setTeamBillingStatus(team.billing_status)
            setCachedTeamData(teamId, team) // Cache the result
          }
        }
      } catch (error) {
        console.error('Failed to check billing status:', error)
      }
    }
    
    checkBillingStatus()
  }, [teamId])

  const handleUpgrade = async () => {
    if (!teamId) {
      toast.error('No team selected')
      return
    }

    if (teamBillingStatus === 'pro') {
      toast.info('Team is already on Pro plan')
      return
    }

    setIsLoading(true)
    
    try {
      console.log('💳 [upgrade] Starting checkout for team:', teamId)
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.testMode) {
        toast.info('Test mode: Use card 4242424242424242 for testing')
      }

      console.log('💳 [upgrade] Redirecting to checkout:', data.sessionId)
      
      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error) {
      console.error('💳 [upgrade] Checkout error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout')
      setIsLoading(false)
    }
  }

  const buttonContent = children || (
    <>
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : showIcon ? (
        <Crown className="w-4 h-4 mr-2" />
      ) : null}
      {isLoading ? 'Starting checkout...' : 'Upgrade to Pro'}
    </>
  )

  return (
    <Button
      onClick={handleUpgrade}
      disabled={isLoading || teamBillingStatus === 'pro'}
      size={size}
      variant={variant}
      className={className}
    >
      {buttonContent}
    </Button>
  )
}

interface ProFeatureLockProps {
  feature: string
  description?: string
  className?: string
}

export function ProFeatureLock({ 
  feature, 
  description = 'This feature requires a Pro plan',
  className = ''
}: ProFeatureLockProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded-lg ${className}`}>
      <div className="flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
        <Crown className="w-8 h-8 text-amber-600 dark:text-amber-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {feature} - Pro Feature
      </h3>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6 max-w-md">
        {description}
      </p>
      
      <ProUpgradeButton size="sm" />
    </div>
  )
}

interface ProBadgeProps {
  className?: string
}

export function ProBadge({ className = '' }: ProBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white ${className}`}>
      <Crown className="w-3 h-3 mr-1" />
      Pro
    </span>
  )
}

interface ProStatusIndicatorProps {
  team?: { billing_status: string; is_pro?: boolean } | null
  showUpgrade?: boolean
  className?: string
}

export function ProStatusIndicator({ 
  team, 
  showUpgrade = true,
  className = '' 
}: ProStatusIndicatorProps) {
  const isPro = team?.billing_status === 'pro' || team?.is_pro

  if (isPro) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <ProBadge />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Pro plan active
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
        Free plan
      </span>
      {showUpgrade && (
        <ProUpgradeButton size="sm" variant="outline" />
      )}
    </div>
  )
}

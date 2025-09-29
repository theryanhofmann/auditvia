'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CreditCard, Star, Loader2, Crown, CheckCircle, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ProUpgradeButton, ProBadge, ProStatusIndicator } from '@/app/components/ui/ProUpgradeButton'
import { Button } from '@/app/components/ui/button'
import { PRO_PLAN, getProFeaturesStatus } from '@/lib/pro-features'
import { testModeHelpers } from '@/lib/stripe'

interface TeamSettingsClientProps {
  team: {
    id: string
    name: string
    billing_status: 'free' | 'trial' | 'pro'
    trial_ends_at: string | null
    stripe_customer_id: string | null
    stripe_subscription_id?: string | null
    is_pro?: boolean
  }
  members: Array<{
    id: string
    role: 'owner' | 'admin' | 'member'
    user: {
      id: string
      name: string | null
      email: string | null
    }
  }>
  currentUserRole: 'owner' | 'admin' | 'member'
}

export function TeamSettingsClient({
  team,
  members,
  currentUserRole
}: TeamSettingsClientProps) {
  const router = useRouter()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)
  
  const isPro = team.billing_status === 'pro' || team.is_pro
  const canManageBilling = currentUserRole === 'owner' || currentUserRole === 'admin'
  const proFeatures = getProFeaturesStatus(team as any) // Cast to match expected type
  const testBanner = testModeHelpers.getTestModeBanner()

  const handleUpgrade = async () => {
    if (isUpgrading) return

    try {
      setIsUpgrading(true)
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ teamId: team.id })
      })

      if (!response.ok) {
        throw new Error('Failed to start checkout')
      }

      const data = await response.json()
      window.location.href = data.url
    } catch (error) {
      console.error('Error starting checkout:', error)
      toast.error('Failed to start checkout')
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleManageSubscription = async () => {
    if (isLoadingPortal) return

    try {
      setIsLoadingPortal(true)
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ teamId: team.id })
      })

      if (!response.ok) {
        throw new Error('Failed to access billing portal')
      }

      const data = await response.json()
      window.location.href = data.url
    } catch (error) {
      console.error('Error accessing billing portal:', error)
      toast.error('Failed to access billing portal')
    } finally {
      setIsLoadingPortal(false)
    }
  }

  // Add URL parameter check for Stripe success/cancel
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('success')) {
      toast.success('Successfully upgraded to Pro!')
      // Remove query params
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('canceled')) {
      toast.error('Upgrade canceled.')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('billing') === 'updated') {
      toast.success('Billing settings updated successfully')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Team Settings</h2>
        <p className="text-muted-foreground">
          Manage your team's settings and subscription
        </p>
      </div>

      <div className="grid gap-6">
        {/* Team Info Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Team Information</h3>
          <div className="rounded-lg border p-4">
            <div className="space-y-2">
              <p>
                <strong>Name:</strong> {team.name}
              </p>
              <p>
                <strong>Members:</strong> {members.length}
              </p>
            </div>
          </div>
        </section>

        {/* Test Mode Banner */}
        {testBanner && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <h4 className="font-medium text-amber-800">{testBanner.title}</h4>
            </div>
            <p className="text-sm text-amber-700 mt-1">{testBanner.description}</p>
          </div>
        )}

        {/* Billing Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Billing & Subscription</h3>
            <ProStatusIndicator team={team} showUpgrade={false} />
          </div>

          {isPro ? (
            /* Pro Plan Active */
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-5 h-5 text-amber-600" />
                    <h4 className="font-semibold text-green-900 dark:text-green-100">Pro Plan Active</h4>
                    <ProBadge />
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your team has access to all Pro features including PDF exports, automated monitoring, and priority support.
                  </p>
                  {team.trial_ends_at && team.billing_status === 'trial' && (
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Trial expires {formatDistanceToNow(new Date(team.trial_ends_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
                {canManageBilling && (
                  <Button
                    onClick={handleManageSubscription}
                    disabled={isLoadingPortal}
                    variant="outline"
                    size="sm"
                  >
                    {isLoadingPortal ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Manage Billing
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Free Plan - Upgrade CTA */
            <div className="rounded-lg border p-6 space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2">Unlock Pro Features</h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Get access to advanced features that help you deliver better accessibility compliance.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium mb-3">What you'll get:</h5>
                  <ul className="space-y-2">
                    {PRO_PLAN.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-3xl font-bold">{PRO_PLAN.price}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">per {PRO_PLAN.period}</div>
                  </div>
                  
                  {canManageBilling ? (
                    <ProUpgradeButton size="lg" className="w-full" />
                  ) : (
                    <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Only team owners and admins can manage billing
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Feature Status Grid */}
          <div>
            <h4 className="font-medium mb-4">Feature Access</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {proFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className={`p-4 rounded-lg border ${
                    feature.hasAccess
                      ? 'border-green-200 bg-green-50 dark:bg-green-950/20'
                      : 'border-gray-200 bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        feature.hasAccess ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      <div>
                        <h5 className="font-medium text-sm">{feature.name}</h5>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{feature.description}</p>
                      </div>
                    </div>
                    {feature.hasAccess ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Crown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Members Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Team Members</h3>
          <div className="rounded-lg border">
            <div className="divide-y">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <p className="font-medium">{member.user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm capitalize text-muted-foreground">
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
} 
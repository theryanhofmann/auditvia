import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CreditCard, Star, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface TeamSettingsClientProps {
  team: {
    id: string
    name: string
    billing_status: 'free' | 'trial' | 'pro'
    trial_ends_at: string | null
    stripe_customer_id: string | null
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

  const canManageBilling = currentUserRole === 'owner' || currentUserRole === 'admin'

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

        {/* Billing Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-medium">Billing</h3>
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="font-medium">
                  {team.billing_status === 'pro'
                    ? 'Pro Plan'
                    : team.billing_status === 'trial'
                    ? 'Trial Plan'
                    : 'Free Plan'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {team.billing_status === 'pro'
                    ? 'Your team is on the Pro plan'
                    : team.billing_status === 'trial'
                    ? `Trial expires ${
                        team.trial_ends_at
                          ? formatDistanceToNow(new Date(team.trial_ends_at), {
                              addSuffix: true,
                            })
                          : 'soon'
                      }`
                    : 'Your team is on the free plan'}
                </p>
              </div>

              {canManageBilling && (
                <div>
                  {team.billing_status === 'pro' ? (
                    <button
                      onClick={handleManageSubscription}
                      disabled={isLoadingPortal}
                      className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                    >
                      {isLoadingPortal ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4" />
                      )}
                      Manage Subscription
                    </button>
                  ) : (
                    <button
                      onClick={handleUpgrade}
                      disabled={isUpgrading}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      {isUpgrading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                      Upgrade to Pro
                    </button>
                  )}
                </div>
              )}
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
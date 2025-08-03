'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { AlertTriangle, CreditCard, LogOut, Settings, Shield, Star, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

interface SettingsClientProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    pro?: boolean
  } | null
}

export function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    }
  }

  const handleUpgrade = async () => {
    if (isUpgrading) return

    try {
      setIsUpgrading(true)
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
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

  const handleDeleteAccount = async () => {
    if (isDeleting) return

    try {
      setIsDeleting(true)
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      toast.success('Account deleted successfully')
      router.push('/')
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account')
      setIsDeleting(false)
    }
  }

  const handleManageSubscription = async () => {
    if (isLoadingPortal) return

    try {
      setIsLoadingPortal(true)
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
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
    }
  }, [])

  // Add URL parameter check for billing updates
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('billing') === 'updated') {
      toast.success('Billing settings updated successfully')
      // Remove query params
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        <div className="flex flex-col h-full">
          <div className="flex-1 px-4 space-y-1 py-4">
            <h2 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Settings
            </h2>
            <nav className="space-y-1">
              <a
                href="#profile"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700"
              >
                <Settings className="w-5 h-5 mr-3" />
                Profile
              </a>
              <a
                href="#billing"
                className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <CreditCard className="w-5 h-5 mr-3" />
                Billing
              </a>
              <div className="relative">
                <button
                  disabled
                  className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg text-gray-400 dark:text-gray-500 cursor-not-allowed"
                >
                  <Users className="w-5 h-5 mr-3" />
                  Team Management
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded-full">
                    Soon
                  </span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pl-64">
        <div className="max-w-4xl mx-auto py-10 px-8">
          {/* Profile Section */}
          <section id="profile" className="space-y-6">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Profile Settings
            </h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-4">
                {user?.image && (
                  <Image
                    src={user.image}
                    alt={user.name || 'User avatar'}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                )}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    {user?.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center space-x-4">
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </section>

          {/* Billing Section */}
          <section id="billing" className="mt-12 space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Billing
            </h2>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {user?.pro ? 'Pro Plan' : 'Free Plan'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {user?.pro
                      ? 'You are currently on the Pro plan'
                      : 'You are currently on the free plan'}
                  </p>
                </div>
                {user?.pro ? (
                  <button
                    onClick={handleManageSubscription}
                    disabled={isLoadingPortal}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    title="Update billing info, cancel, or change your plan"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    {isLoadingPortal ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Manage Subscription'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleUpgrade}
                    disabled={isUpgrading}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    {isUpgrading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Processing...
                      </>
                    ) : (
                      'Upgrade to Pro'
                    )}
                  </button>
                )}
              </div>

              <div className="mt-6 grid gap-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {user?.pro ? 'Your Pro Features' : 'Pro Features'}
                    </h4>
                    <ul className="mt-2 space-y-2 text-sm text-gray-500 dark:text-gray-400">
                      <li className="flex items-center">
                        <span className={user?.pro ? 'text-green-500 mr-2' : 'text-gray-400 mr-2'}>
                          {user?.pro ? '✓' : '•'}
                        </span>
                        Weekly automated monitoring
                      </li>
                      <li className="flex items-center">
                        <span className={user?.pro ? 'text-green-500 mr-2' : 'text-gray-400 mr-2'}>
                          {user?.pro ? '✓' : '•'}
                        </span>
                        Unlimited accessibility scans
                      </li>
                      <li className="flex items-center">
                        <span className={user?.pro ? 'text-green-500 mr-2' : 'text-gray-400 mr-2'}>
                          {user?.pro ? '✓' : '•'}
                        </span>
                        PDF report export
                      </li>
                      <li className="flex items-center">
                        <span className={user?.pro ? 'text-green-500 mr-2' : 'text-gray-400 mr-2'}>
                          {user?.pro ? '✓' : '•'}
                        </span>
                        Priority support
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="mt-12 space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Danger Zone
            </h2>

            <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-red-200 dark:border-red-900/50 p-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-lg font-medium">Delete Account</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg transition-colors"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      Are you sure? This will permanently delete your account.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        disabled={isDeleting}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 rounded-lg transition-colors"
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
} 
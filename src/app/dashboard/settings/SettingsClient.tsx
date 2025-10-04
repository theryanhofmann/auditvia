'use client'

import { useState, useEffect } from 'react'
import { 
  User, Bell, Palette, Scan, Zap, Shield, CreditCard, 
  Users,   Moon, Sun, Monitor,  
    Save, Loader2
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { ReferralSection } from '@/app/components/settings/ReferralSection'

interface UserSettings {
  // Profile
  full_name: string
  email: string
  avatar_url?: string
  
  // Notifications
  email_notifications: boolean
  scan_complete_notifications: boolean
  new_violations_notifications: boolean
  weekly_summary: boolean
  sound_enabled: boolean
  
  // Accessibility Preferences
  theme: 'light' | 'dark' | 'system'
  reduce_motion: boolean
  high_contrast: boolean
  text_size: 'small' | 'medium' | 'large'
  
  // Scan Settings
  auto_scan_enabled: boolean
  scan_frequency: 'daily' | 'weekly' | 'monthly'
  max_pages_per_scan: number
  include_subdomains: boolean
  
  // Advanced
  api_access_enabled: boolean
  webhook_url?: string
}

export function SettingsClient() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('profile')
  const [settings, setSettings] = useState<UserSettings>({
    full_name: '',
    email: '',
    email_notifications: true,
    scan_complete_notifications: true,
    new_violations_notifications: true,
    weekly_summary: false,
    sound_enabled: true,
    theme: 'light',
    reduce_motion: false,
    high_contrast: false,
    text_size: 'medium',
    auto_scan_enabled: false,
    scan_frequency: 'weekly',
    max_pages_per_scan: 100,
    include_subdomains: false,
    api_access_enabled: false,
  })

  useEffect(() => {
    if (status === 'authenticated') {
      loadSettings()
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const loadSettings = async () => {
    if (!session?.user) return
    
    setLoading(true)
    try {
      // Load user preferences from API or local storage
      // For now, use session data
      setSettings(prev => ({
        ...prev,
        full_name: session.user.name || session.user.email?.split('@')[0] || '',
        email: session.user.email || '',
        // Load any saved preferences from localStorage or API
        ...JSON.parse(localStorage.getItem('userPreferences') || '{}'),
      }))
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!session?.user) return
    
    setSaving(true)
    try {
      // Save preferences to localStorage for now
      // You can replace this with an API call later
      const preferences = {
        email_notifications: settings.email_notifications,
        scan_complete_notifications: settings.scan_complete_notifications,
        new_violations_notifications: settings.new_violations_notifications,
        weekly_summary: settings.weekly_summary,
        sound_enabled: settings.sound_enabled,
        theme: settings.theme,
        reduce_motion: settings.reduce_motion,
        high_contrast: settings.high_contrast,
        text_size: settings.text_size,
        auto_scan_enabled: settings.auto_scan_enabled,
        scan_frequency: settings.scan_frequency,
        max_pages_per_scan: settings.max_pages_per_scan,
        include_subdomains: settings.include_subdomains,
        api_access_enabled: settings.api_access_enabled,
        webhook_url: settings.webhook_url,
      }
      
      localStorage.setItem('userPreferences', JSON.stringify(preferences))
      toast.success('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'accessibility', label: 'Accessibility', icon: Palette },
    { id: 'scans', label: 'Scan Settings', icon: Scan },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'referrals', label: 'Referrals', icon: Users },
  ]

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header with Save Button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your account preferences and application settings
            </p>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
        {/* Main Content */}
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-2">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                      ${activeSection === section.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {section.label}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {/* Profile Section */}
              {activeSection === 'profile' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={settings.full_name}
                        onChange={(e) => setSettings({ ...settings, full_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={settings.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Email cannot be changed here. Contact support to update.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profile Picture
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xl">
                          {settings.full_name.charAt(0).toUpperCase() || settings.email.charAt(0).toUpperCase()}
                        </div>
                        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                          Upload New Picture
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, email_notifications: !settings.email_notifications })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.email_notifications ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.email_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Scan Complete</h3>
                        <p className="text-sm text-gray-500">Get notified when scans finish</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, scan_complete_notifications: !settings.scan_complete_notifications })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.scan_complete_notifications ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.scan_complete_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">New Violations</h3>
                        <p className="text-sm text-gray-500">Alert when new issues are found</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, new_violations_notifications: !settings.new_violations_notifications })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.new_violations_notifications ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.new_violations_notifications ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Weekly Summary</h3>
                        <p className="text-sm text-gray-500">Receive weekly progress reports</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, weekly_summary: !settings.weekly_summary })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.weekly_summary ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.weekly_summary ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Sound Effects</h3>
                        <p className="text-sm text-gray-500">Play sounds for notifications</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, sound_enabled: !settings.sound_enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.sound_enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.sound_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Accessibility Section */}
              {activeSection === 'accessibility' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Accessibility Preferences</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Theme
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['light', 'dark', 'system'] as const).map((theme) => (
                          <button
                            key={theme}
                            onClick={() => setSettings({ ...settings, theme })}
                            className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg transition-colors ${
                              settings.theme === theme
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {theme === 'light' && <Sun className="w-6 h-6" />}
                            {theme === 'dark' && <Moon className="w-6 h-6" />}
                            {theme === 'system' && <Monitor className="w-6 h-6" />}
                            <span className="text-sm font-medium capitalize">{theme}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Text Size
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['small', 'medium', 'large'] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => setSettings({ ...settings, text_size: size })}
                            className={`p-4 border-2 rounded-lg transition-colors ${
                              settings.text_size === size
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className={`font-medium capitalize ${
                              size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
                            }`}>
                              {size}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Reduce Motion</h3>
                        <p className="text-sm text-gray-500">Minimize animations and transitions</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, reduce_motion: !settings.reduce_motion })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.reduce_motion ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.reduce_motion ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">High Contrast</h3>
                        <p className="text-sm text-gray-500">Increase color contrast for better visibility</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, high_contrast: !settings.high_contrast })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.high_contrast ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.high_contrast ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Scan Settings Section */}
              {activeSection === 'scans' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Scan Settings</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Auto-Scan</h3>
                        <p className="text-sm text-gray-500">Automatically scan sites on schedule</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, auto_scan_enabled: !settings.auto_scan_enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.auto_scan_enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.auto_scan_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {settings.auto_scan_enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Scan Frequency
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                            <button
                              key={freq}
                              onClick={() => setSettings({ ...settings, scan_frequency: freq })}
                              className={`p-3 border-2 rounded-lg transition-colors ${
                                settings.scan_frequency === freq
                                  ? 'border-blue-600 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <span className="text-sm font-medium capitalize">{freq}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Pages Per Scan
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={settings.max_pages_per_scan}
                        onChange={(e) => setSettings({ ...settings, max_pages_per_scan: parseInt(e.target.value) || 100 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum number of pages to scan per site (1-1000)
                      </p>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Include Subdomains</h3>
                        <p className="text-sm text-gray-500">Scan all subdomains of the main site</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, include_subdomains: !settings.include_subdomains })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.include_subdomains ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.include_subdomains ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Integrations Section */}
              {activeSection === 'integrations' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Integrations</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">API Access</h3>
                        <p className="text-sm text-gray-500">Enable programmatic access via API</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, api_access_enabled: !settings.api_access_enabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.api_access_enabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.api_access_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    {settings.api_access_enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Webhook URL (Optional)
                        </label>
                        <input
                          type="url"
                          value={settings.webhook_url || ''}
                          onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="https://your-site.com/webhook"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Receive POST notifications when scans complete
                        </p>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Connected Integrations</h4>
                      <p className="text-sm text-blue-700">
                        GitHub, Jira, and Slack integrations are managed per-team in Team Settings.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Section */}
              {activeSection === 'security' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Security</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Change Password</h3>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        Update Password
                      </button>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Add an extra layer of security to your account
                      </p>
                      <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                        Enable 2FA
                      </button>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Active Sessions</h3>
                      <p className="text-sm text-gray-500 mb-3">
                        Manage devices where you're currently logged in
                      </p>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        View Sessions
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Section */}
              {activeSection === 'billing' && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing & Subscription</h2>
                  
                  <div className="space-y-6 max-w-2xl">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Pro Plan</h3>
                          <p className="text-sm text-gray-600 mt-1">$49/month • Billed monthly</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">$49</p>
                          <p className="text-sm text-gray-600">per month</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Payment Method</h3>
                      <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                        <CreditCard className="w-8 h-8 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">•••• •••• •••• 4242</p>
                          <p className="text-xs text-gray-500">Expires 12/2025</p>
                        </div>
                        <button className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Update
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Billing History</h3>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        View Invoices
                      </button>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                        Cancel Subscription
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Referrals Section */}
              {activeSection === 'referrals' && (
                <div className="p-6">
                  <ReferralSection />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


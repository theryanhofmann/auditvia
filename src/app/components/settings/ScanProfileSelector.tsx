'use client'

import { useState } from 'react'
import { Info, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface ScanProfileSelectorProps {
  siteId: string
  currentProfile: 'quick' | 'standard' | 'deep'
  onProfileChange?: (profile: 'quick' | 'standard' | 'deep') => void
}

const PROFILE_CONFIG = {
  quick: {
    label: 'Quick',
    description: '1 page, 1 state',
    duration: '~30 seconds',
    pages: 1,
    states: 1,
    recommended: 'Testing or quick checks'
  },
  standard: {
    label: 'Standard',
    description: '3 pages, 2 states per page',
    duration: '~1-2 minutes',
    pages: 3,
    states: '2 per page',
    recommended: 'Regular monitoring (recommended)'
  },
  deep: {
    label: 'Deep',
    description: '5 pages, 3 states per page',
    duration: '~2-3 minutes',
    pages: 5,
    states: '3 per page',
    recommended: 'Comprehensive audits'
  }
}

export function ScanProfileSelector({ 
  siteId, 
  currentProfile,
  onProfileChange 
}: ScanProfileSelectorProps) {
  const [profile, setProfile] = useState<'quick' | 'standard' | 'deep'>(currentProfile || 'deep')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (profile === currentProfile) return

    setSaving(true)
    try {
      const response = await fetch(`/api/sites/${siteId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_scan_profile: profile })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save scan profile')
      }

      toast.success('Scan profile updated successfully!')
      onProfileChange?.(profile)
    } catch (error) {
      console.error('Error saving scan profile:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save scan profile')
      setProfile(currentProfile) // Revert on error
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Default Scan Profile
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Choose how comprehensive your accessibility scans should be
        </p>
      </div>

      <div className="space-y-3">
        {Object.entries(PROFILE_CONFIG).map(([key, config]) => {
          const isSelected = profile === key
          
          return (
            <label
              key={key}
              className={`
                relative flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer
                transition-all
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              <input
                type="radio"
                name="scan_profile"
                value={key}
                checked={isSelected}
                onChange={(e) => setProfile(e.target.value as any)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {config.label}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-0.5">
                  {config.description}
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>⏱️ {config.duration}</span>
                  <span>•</span>
                  <span>{config.pages} {config.pages === 1 ? 'page' : 'pages'}</span>
                  <span>•</span>
                  <span>{config.states} {typeof config.states === 'string' ? 'states' : 'state'}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 italic">
                  {config.recommended}
                </div>
              </div>
            </label>
          )
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-medium">
              Deep scans find 3-5× more issues
            </p>
            <p className="text-sm text-blue-800 mt-1">
              By testing menus, modals, and multiple pages, Deep scans discover accessibility 
              issues that single-page scans miss. Only WCAG violations affect your compliance score.
            </p>
          </div>
        </div>
      </div>

      {profile !== currentProfile && (
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={() => setProfile(currentProfile)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      )}
    </div>
  )
}


'use client'

import { useState, useCallback } from 'react'
import { StatsPanel } from './dashboard/StatsPanel'
import { SitesTable } from './dashboard/SitesTable'
import { AddSiteModal } from './ui/AddSiteModal'
import { useSites } from '@/app/lib/hooks/useSites'
import { toast } from 'sonner'
import { useTeam } from '@/app/context/TeamContext'

export function DashboardClient() {
  const { teamId, loading: teamLoading } = useTeam()
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false)
  const { sites, isLoading, isError, refresh } = useSites()

  const handleSiteAdded = useCallback(() => {
    setIsAddSiteModalOpen(false)
    refresh()
  }, [refresh])

  const handleSiteDeleted = useCallback(() => {
    refresh()
    toast.success('Site deleted successfully')
  }, [refresh])

  const handleMonitoringToggled = useCallback(() => {
    refresh()
  }, [refresh])

  if (teamLoading) {
    return <div>Loading team...</div>
  }

  if (!teamId) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">No Team Selected</h2>
        <p className="mt-2 text-gray-600">Please select or create a team to view your dashboard.</p>
        <button 
          onClick={() => {/* TODO: Open team creation */}} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Create Team
        </button>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">Error loading sites: {isError.message || 'Unknown error'}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
        <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 h-96 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <button
          onClick={() => setIsAddSiteModalOpen(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Add Site
        </button>
      </div>

      <StatsPanel sites={sites} />

      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="p-6">
          <h2 className="text-lg font-semibold">Sites</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage your monitored websites and view their accessibility status.
          </p>
        </div>
        <SitesTable
          sites={sites}
          onSiteDeleted={handleSiteDeleted}
          onMonitoringToggled={handleMonitoringToggled}
        />
      </div>

      <AddSiteModal
        isOpen={isAddSiteModalOpen}
        onClose={() => setIsAddSiteModalOpen(false)}
        onSuccess={handleSiteAdded}
      />
    </div>
  )
} 
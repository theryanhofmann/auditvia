'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import { AINativeOverview } from '@/app/components/dashboard/AINativeOverview'
import { useSites } from '@/app/lib/hooks/useSites'

// Loading component (no hooks)
function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center">
      <div className="animate-pulse space-y-8 w-full max-w-7xl px-6">
        <div className="h-8 bg-slate-200 rounded w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
        <div className="h-96 bg-slate-200 rounded-xl" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { sites = [], isLoading, isError } = useSites()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [teamLoading, setTeamLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
    }
  }, [status, router])

  // Fetch user's team
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !teamId && !teamLoading) {
      setTeamLoading(true)
      const fetchTeam = async () => {
        try {
          console.log('[dashboard] Fetching team for user:', session.user.id)
          const response = await fetch('/api/teams/current')
          console.log('[dashboard] Team response status:', response.status)
          
          if (response.ok) {
            const data = await response.json()
            console.log('[dashboard] Team data:', data)
            
            // API returns teamId (not team_id)
            if (data.teamId) {
              setTeamId(data.teamId)
              setTeamError(null)
            } else {
              setTeamError('No team found. Please contact support.')
            }
          } else {
            const errorText = await response.text()
            console.error('[dashboard] Failed to fetch team:', response.status, errorText)
            setTeamError('Failed to load team. Please refresh the page.')
          }
        } catch (error) {
          console.error('[dashboard] Error fetching team:', error)
          setTeamError('Network error. Please check your connection.')
        } finally {
          setTeamLoading(false)
        }
      }
      fetchTeam()
    }
  }, [status, session, teamId, teamLoading])

  // Show loading state
  if (status === 'loading' || isLoading || teamLoading) {
    return <DashboardLoading />
  }

  // Show error state
  if (teamError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-slate-600 mb-6">{teamError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Render dashboard with team data
  if (status === 'authenticated' && teamId) {
    return (
      <>
        <Toaster position="top-right" />
        <AINativeOverview teamId={teamId} sites={sites as any[]} />
      </>
    )
  }

  return <DashboardLoading />
} 
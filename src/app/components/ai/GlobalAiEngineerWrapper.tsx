'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { GlobalAiEngineer } from './GlobalAiEngineer'

/**
 * Wrapper component that fetches team context and renders the global AI Engineer
 */
export function GlobalAiEngineerWrapper() {
  const { data: session, status } = useSession()
  const [teamId, setTeamId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id && !teamId) {
      const fetchTeam = async () => {
        try {
          const response = await fetch('/api/teams/current')
          if (response.ok) {
            const data = await response.json()
            if (data.teamId) {
              setTeamId(data.teamId)
            }
          }
        } catch (error) {
          console.error('[GlobalAiEngineer] Error fetching team:', error)
        }
      }
      fetchTeam()
    }
  }, [status, session, teamId])

  // Only render if authenticated
  if (status !== 'authenticated') {
    return null
  }

  return <GlobalAiEngineer teamId={teamId || undefined} />
}


'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Team, TeamContextType, TeamContextError } from '@/app/types/teams'

const TeamContext = createContext<TeamContextType | null>(null)

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teamId, setTeamIdState] = useState<string | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function initializeTeam() {
      // Load saved teamId
      const savedTeamId = localStorage.getItem('activeTeamId')
      if (savedTeamId) {
        setTeamIdState(savedTeamId)
        setLoading(false)
        return
      }

      // Fetch user's teams
      try {
        const response = await fetch('/api/teams')
        if (!response.ok) throw new Error('Failed to fetch teams')
        const teams = await response.json()

        if (teams.length > 0) {
          const defaultTeamId = teams[0].team.id // Updated to match new response format
          setTeamId(defaultTeamId)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch teams'))
      } finally {
        setLoading(false)
      }
    }

    initializeTeam()
  }, [])

  useEffect(() => {
    // Fetch team details when teamId changes
    async function fetchTeamDetails() {
      if (!teamId) {
        setTeam(null)
        return
      }

      try {
        setLoading(true)
        const response = await fetch(`/api/teams/${teamId}`)
        if (!response.ok) throw new Error('Failed to fetch team details')
        
        const data = await response.json()
        setTeam(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch team'))
        setTeam(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamDetails()
  }, [teamId])

  const setTeamId = (id: string) => {
    localStorage.setItem('activeTeamId', id)
    setTeamIdState(id)
  }

  return (
    <TeamContext.Provider 
      value={{ 
        teamId, 
        team, 
        setTeamId, 
        loading,
        error
      }}
    >
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam(): TeamContextType {
  const context = useContext(TeamContext)
  if (!context) {
    throw new TeamContextError()
  }
  return context
} 
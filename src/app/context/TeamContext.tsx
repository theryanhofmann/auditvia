'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Team, TeamContextType, TeamContextError } from '@/app/types/teams'

const TeamContext = createContext<TeamContextType | null>(null)

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [teamId, setTeamIdState] = useState<string | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function initializeTeam() {
      try {
        // Check URL for teamId first
        const urlTeamId = searchParams?.get('teamId')
        
        if (urlTeamId) {
          // Validate user is member of this team
          const validateResponse = await fetch('/api/teams/current', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId: urlTeamId })
          })
          
          if (validateResponse.ok) {
            setTeamIdState(urlTeamId)
            return
          }
        }
        
        // Otherwise get current team from server (handles cookie + auto-creation)
        const response = await fetch('/api/teams/current')
        if (response.ok) {
          const data = await response.json()
          setTeamIdState(data.teamId)
          
          // Update URL to include teamId if not present
          if (!urlTeamId && pathname && !pathname.includes('/auth')) {
            const params = new URLSearchParams(searchParams?.toString())
            params.set('teamId', data.teamId)
            router.replace(`${pathname}?${params.toString()}`, { scroll: false })
          }
        } else {
          // Fallback: fetch user's teams and use first one
          const teamsResponse = await fetch('/api/teams')
          if (teamsResponse.ok) {
            const teams = await teamsResponse.json()
            if (teams.length > 0) {
              const defaultTeamId = teams[0].team.id
              setTeamId(defaultTeamId) // This will call setCurrentTeamId API
            }
          } else {
            throw new Error('Failed to fetch teams')
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize team'))
      } finally {
        setLoading(false)
      }
    }

    initializeTeam()
  }, [])

  // Simple cache for team data to avoid repeated API calls
  const teamCache = new Map<string, { data: any; timestamp: number }>()

  useEffect(() => {
    // Fetch team details when teamId changes
    async function fetchTeamDetails() {
      if (!teamId) {
        setTeam(null)
        return
      }

      try {
        setLoading(true)

        // Check cache first (5 minute TTL)
        const cached = teamCache.get(teamId)
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
          setTeam(cached.data)
          setError(null)
          return
        }

        const response = await fetch(`/api/teams/${teamId}`)
        if (!response.ok) {
          // Handle 403/404 errors gracefully
          if (response.status === 403) {
            console.debug(`🏛️ [team-context] Access denied to team ${teamId} - user not a member`)
            setTeam(null)
            setError(null) // Don't treat 403 as an error
            return
          } else if (response.status === 404) {
            console.debug(`🏛️ [team-context] Team ${teamId} not found - may have been deleted`)
            setTeam(null)
            setError(null) // Don't treat 404 as an error
            return
          } else {
            console.error(`🏛️ [team-context] Failed to fetch team details: ${response.status}`)
            throw new Error(`Failed to fetch team details: ${response.status}`)
          }
        }

        const data = await response.json()

        // Cache the result
        teamCache.set(teamId, { data, timestamp: Date.now() })

        setTeam(data)
        setError(null)
      } catch (err) {
        // Only set error for non-403 failures
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        if (!errorMessage.includes('403')) {
          console.error(`🏛️ [team-context] Team fetch error:`, err)
          setError(err instanceof Error ? err : new Error('Failed to fetch team'))
        }
        setTeam(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamDetails()
  }, [teamId])

  const setTeamId = async (id: string) => {
    try {
      // Update server-side cookie
      await fetch('/api/teams/current', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId: id }),
      })
      
      // Update local state
      setTeamIdState(id)
      
      // Update URL to include new teamId
      if (pathname && !pathname.includes('/auth')) {
        const params = new URLSearchParams(searchParams?.toString())
        params.set('teamId', id)
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      }
    } catch (error) {
      console.error('Error setting team ID:', error)
      setError(error instanceof Error ? error : new Error('Failed to set team'))
    }
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
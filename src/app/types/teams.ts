export interface Team {
  id: string
  name: string
  created_at: string
  role: 'owner' | 'admin' | 'member'
}

export interface TeamContextType {
  teamId: string | null
  team: Team | null
  setTeamId: (id: string) => Promise<void>
  loading: boolean
  error: Error | null
}

export class TeamContextError extends Error {
  constructor(message: string = 'useTeam must be used within a TeamProvider') {
    super(message)
    this.name = 'TeamContextError'
  }
} 
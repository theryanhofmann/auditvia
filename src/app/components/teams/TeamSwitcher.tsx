'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/app/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/app/components/ui/popover'
import { cn } from '@/app/lib/utils'
import { useToast } from '@/app/components/ui/use-toast'

interface Team {
  role: string
  teams: {
    id: string
    name: string
    created_at: string
  }
}

export function TeamSwitcher() {
  const [open, setOpen] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Load selected team from localStorage
    const savedTeam = localStorage.getItem('selectedTeam')
    if (savedTeam) {
      setSelectedTeam(savedTeam)
    }

    // Fetch teams
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (!response.ok) throw new Error('Failed to fetch teams')
      
      const data = await response.json()
      setTeams(data)
      
      // Set first team as selected if none selected
      if (!selectedTeam && data.length > 0) {
        setSelectedTeam(data[0].teams.id)
        localStorage.setItem('selectedTeam', data[0].teams.id)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeam(teamId)
    localStorage.setItem('selectedTeam', teamId)
    setOpen(false)
    
    // Refresh page to update context
    router.refresh()
  }

  const currentTeam = teams.find(t => t.teams.id === selectedTeam)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a team"
          className="w-[200px] justify-between"
        >
          {loading ? (
            <span className="animate-pulse">Loading teams...</span>
          ) : currentTeam ? (
            <>
              <span>{currentTeam.teams.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                ({currentTeam.role})
              </span>
            </>
          ) : (
            'Select a team'
          )}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search teams..." />
          <CommandList>
            <CommandEmpty>No teams found.</CommandEmpty>
            <CommandGroup heading="Your Teams">
              {teams.map((team) => (
                <CommandItem
                  key={team.teams.id}
                  onSelect={() => handleTeamSelect(team.teams.id)}
                  className="text-sm"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedTeam === team.teams.id
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <span>{team.teams.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {team.role}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  router.push('/teams/new')
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Team
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 
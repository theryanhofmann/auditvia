import { useEffect, useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { toast } from 'sonner'

export function useTeamPro(teamId: string | undefined) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasPro, setHasPro] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!teamId) {
      setIsLoading(false)
      return
    }

    async function checkProAccess() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .rpc('has_team_pro_access', { team_id: teamId })
          .single()

        if (error) throw error

        setHasPro(!!data)
      } catch (err) {
        console.error('Error checking pro access:', err)
        setError(err as Error)
        toast.error('Failed to check pro access')
      } finally {
        setIsLoading(false)
      }
    }

    checkProAccess()
  }, [teamId])

  return { isLoading, hasPro, error }
} 
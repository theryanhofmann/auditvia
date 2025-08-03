'use client'

import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import type { Database } from '@/app/types/database'
import { useTeam } from '@/app/context/TeamContext'

type Site = Database['public']['Tables']['sites']['Row'] & {
  scans?: Array<{
    id: string
    created_at: string
    score: number | null
    total_violations: number | null
  }>
}

interface SitesResponse {
  sites: Site[]
}

const fetcher = async (url: string): Promise<Site[]> => {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to fetch sites')
    }
    const data: SitesResponse = await response.json()
    return data.sites || []
  } catch (error) {
    console.error('Error fetching sites:', error)
    throw error
  }
}

export function useSites() {
  const { data: session } = useSession()
  const { teamId } = useTeam()
  
  const swrKey = session?.user && teamId ? `/api/sites?teamId=${teamId}` : null
  
  const { data, error, mutate } = useSWR<Site[]>(
    swrKey,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      suspense: false,
      fallbackData: [],
    }
  )

  return {
    sites: data || [],
    isLoading: !error && !data && !!swrKey,
    isError: error,
    refresh: mutate
  }
} 
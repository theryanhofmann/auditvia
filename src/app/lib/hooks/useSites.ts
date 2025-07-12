'use client'

import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import type { Database } from '@/app/types/database'

type Site = Database['public']['Tables']['sites']['Row']

interface SitesResponse {
  sites: any[]
}

const fetcher = async (url: string): Promise<Site[]> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch sites')
  }
  const data: SitesResponse = await response.json()
  
  // Transform the API response to match the Site interface
  return data.sites?.map(site => ({
    id: site.id,
    url: site.url,
    name: site.name,
    created_at: site.created_at,
    updated_at: site.updated_at,
    monitoring_enabled: site.monitoring_enabled || false,
    monitoring: site.monitoring || null,
    user_id: site.user_id,
    custom_domain: site.custom_domain,
    github_id: site.github_id
  })) || []
}

export function useSites() {
  const { data: session } = useSession()
  
  const { data: sites, error, mutate } = useSWR<Site[]>(
    session?.user ? '/api/sites' : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  )

  return {
    sites: sites || [],
    isLoading: !error && !sites,
    isError: error,
    refresh: mutate
  }
} 
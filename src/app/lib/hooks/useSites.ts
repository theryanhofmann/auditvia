'use client'

import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { Site } from '@/app/types/dashboard'

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
  return data.sites?.map(site => {
    return {
      id: site.id,
      url: site.url,
      name: site.name,
      description: null,
      score: site.latest_score,
      status: site.latest_score !== null ? 'completed' : 'idle',
      last_scan: site.latest_scan_at,
      created_at: site.created_at,
      updated_at: site.updated_at,
      monitoring_enabled: site.monitoring_enabled || false,
      user_id: site.user_id,
      latest_audit_result_id: null, // We'll implement this later if needed
      custom_domain: site.custom_domain
    }
  }) || []
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
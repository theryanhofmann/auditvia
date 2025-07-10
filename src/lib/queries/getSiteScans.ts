import { Database } from '@/app/types/database'
import { createClient } from '@supabase/supabase-js'

export async function getSiteScans(siteId: string) {
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: scans, error } = await client
    .from('scans')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching scans:', error)
    throw new Error('Failed to fetch scans')
  }

  return scans
} 
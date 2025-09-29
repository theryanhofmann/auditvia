import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { ScanStuckPage } from '../ScanStuckPage'

interface StuckPageProps {
  params: Promise<{ scanId: string }>
  searchParams: Promise<{ 
    reason?: 'timeout' | 'heartbeat_stale' | 'unknown'
    maxRuntime?: string
    heartbeatInterval?: string
  }>
}

export default async function StuckPage({ params, searchParams }: StuckPageProps) {
  const { scanId } = await params
  const searchParamsValue = await searchParams
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false }
    }
  )

  // Fetch scan details
  const { data: scan, error } = await supabase
    .from('scans')
    .select(`
      *,
      sites (
        id,
        url,
        name
      )
    `)
    .eq('id', scanId)
    .single()

  if (error || !scan) {
    console.error('Failed to fetch scan for stuck page:', error)
    redirect('/dashboard')
  }

  // Verify user has access to this scan
  if (scan.user_id !== session.user.id) {
    redirect('/dashboard')
  }

  const site = Array.isArray(scan.sites) ? scan.sites[0] : scan.sites

  return (
    <ScanStuckPage
      scanId={scan.id}
      siteId={scan.site_id}
      siteUrl={site?.url || ''}
      siteName={site?.name}
      createdAt={scan.created_at}
      lastActivityAt={scan.last_activity_at}
      progressMessage={scan.progress_message}
      reason={searchParamsValue.reason || 'unknown'}
      maxRuntimeMinutes={searchParamsValue.maxRuntime ? parseInt(searchParamsValue.maxRuntime) : scan.max_runtime_minutes || 15}
      heartbeatIntervalSeconds={searchParamsValue.heartbeatInterval ? parseInt(searchParamsValue.heartbeatInterval) : scan.heartbeat_interval_seconds || 30}
    />
  )
}

import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'
import { ScanReportClient } from './ScanReportClient'
import type { ScanData } from '@/app/types/scans'

interface RouteParams {
  params: {
    scanId: string
  }
}

type ScanWithSite = {
  id: string
  sites: {
    id: string
    name: string | null
    url: string
    user_id: string | null
  }
}

export default async function ScanReportPage({ params }: RouteParams) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    notFound()
  }

  const supabase = await createClient()

  // Get scan with site details
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select(`
      id,
      score,
      status,
      started_at,
      finished_at,
      created_at,
      site_id,
      sites!inner (
        id,
        name,
        url,
        user_id
      )
    `)
    .eq('id', params.scanId)
    .single()

  if (scanError || !scan) {
    notFound()
  }

  // Type assertion since we know the structure from our query
  const typedScan = {
    id: scan.id,
    sites: scan.sites[0]
  } as ScanWithSite

  // Verify site belongs to the authenticated user
  if (typedScan.sites?.user_id !== userId) {
    notFound()
  }

  // Transform scan data to match expected type
  const scanData: ScanData = {
    id: scan.id,
    score: scan.score,
    status: scan.status,
    started_at: scan.started_at,
    finished_at: scan.finished_at,
    created_at: scan.created_at,
    site_id: scan.site_id,
    sites: scan.sites[0]
  }

  return <ScanReportClient scanId={params.scanId} scan={scanData} />
} 
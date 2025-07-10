import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'
import { ScanHistoryClient } from './ScanHistoryClient'

export const metadata = {
  title: "Scan History",
  description: "View your website's accessibility scan history",
}

interface RouteParams {
  params: {
    siteId: string
  }
}

type ScanHistoryItem = {
  id: string
  created_at: string
  score: number | null
  status: string
  total_violations: number | null
  issues_count: number | null
  site: {
    name: string | null
    url: string
  }
}

type ScanResponse = {
  id: string
  created_at: string
  score: number | null
  status: string
  total_violations: number | null
  issues: { count: number }[]
  site: Array<{
    name: string | null
    url: string
  }>
}

export default async function ScanHistoryPage({ params }: RouteParams) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    notFound()
  }

  const supabase = await createClient()

  // First verify the user owns this site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, user_id')
    .eq('id', params.siteId)
    .single()

  if (siteError || !site) {
    notFound()
  }

  if (site.user_id !== userId) {
    notFound()
  }

  // Get scans with issue counts
  const { data: scans, error: scansError } = await supabase
    .from('scans')
    .select(`
      id,
      created_at,
      score,
      status,
      total_violations,
      issues (
        count
      ),
      site:sites!inner (
        name,
        url
      )
    `)
    .eq('site_id', params.siteId)
    .order('created_at', { ascending: false })

  if (scansError) {
    console.error('Error fetching scans:', scansError)
    notFound()
  }

  // Transform the response to include issue counts
  const processedScans: ScanHistoryItem[] = (scans as unknown as ScanResponse[] || []).map(scan => {
    const siteData = scan.site?.[0] || { name: null, url: '' }
    return {
      id: scan.id,
      created_at: scan.created_at,
      score: scan.score,
      status: scan.status,
      total_violations: scan.total_violations,
      issues_count: scan.issues?.length || null,
      site: {
        name: siteData.name,
        url: siteData.url
      }
    }
  })

  return <ScanHistoryClient siteId={params.siteId} initialScans={processedScans} />
} 
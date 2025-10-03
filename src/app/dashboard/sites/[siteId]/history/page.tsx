import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'
import { ScanHistoryClient } from './ScanHistoryClient'

export const metadata = {
  title: "Scan History",
  description: "View your website's accessibility scan history",
}

interface RouteParams {
  params: Promise<{
    siteId: string
  }>
  searchParams?: Promise<{
    teamId?: string
  }>
}

export default async function ScanHistoryPage({ params, searchParams }: RouteParams) {
  // Await params as required by Next.js 15
  const { siteId } = await params
  const searchParamsResolved = searchParams ? await searchParams : {}
  
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    notFound()
  }

  // Use service role client to bypass RLS (same as other site pages)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  // Get teamId from search params
  const teamId = searchParamsResolved?.teamId

  console.log('📍 [ScanHistory] Route hit:', { siteId, teamId, userId })

  if (!teamId) {
    console.error('[ScanHistory] No teamId provided')
    notFound()
  }

  // Verify team membership
  const { data: membership, error: membershipError } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .limit(1)

  console.log('🔍 [ScanHistory] Membership check:', { 
    found: membership && membership.length > 0, 
    role: membership?.[0]?.role,
    error: membershipError?.message 
  })

  if (!membership || membership.length === 0) {
    console.error('[ScanHistory] User not member of team')
    notFound()
  }

  // Verify the site belongs to this team
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, team_id, name, url')
    .eq('id', siteId)
    .eq('team_id', teamId)
    .single()

  console.log('🔍 [ScanHistory] Site check:', { 
    found: !!site, 
    siteName: site?.name,
    error: siteError?.message 
  })

  if (siteError || !site) {
    console.error('[ScanHistory] Site not found or does not belong to team')
    notFound()
  }
  
  console.log('✅ [ScanHistory] All checks passed, rendering component')

  // Note: ScanHistoryClient will fetch the scans data itself
  // We've already verified:
  // 1. User is authenticated
  // 2. User is member of the team
  // 3. Site belongs to this team
  
  return <ScanHistoryClient siteId={siteId} />
} 
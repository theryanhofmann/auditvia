import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { createClient } from '@/app/lib/supabase/server'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { diffViolations } from '@/app/lib/utils'
import { CompareClient } from './CompareClient'

interface RouteParams {
  params: {
    scanId1: string
    scanId2: string
  }
}

interface Scan {
  id: string
  status: string
  started_at: string
  finished_at: string | null
  total_violations: number
  passes: number
  incomplete: number
  inapplicable: number
  sites: {
    id: string
    name: string | null
    url: string
    user_id: string
  }
  issues: Array<{
    id: string
    rule: string
    selector: string
    impact: 'critical' | 'serious' | 'moderate' | 'minor'
    description: string
    help_url: string
    html: string
  }>
}

export default async function ComparePage({ params }: RouteParams) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    notFound()
  }

  const supabase = await createClient()

  // Get both scans with site details
  const [{ data: scan1 }, { data: scan2 }] = await Promise.all([
    supabase
      .from('scans')
      .select(`
        id,
        status,
        started_at,
        finished_at,
        total_violations,
        passes,
        incomplete,
        inapplicable,
        sites!inner (
          id,
          name,
          url,
          user_id
        ),
        issues (
          id,
          rule,
          selector,
          impact,
          description,
          help_url,
          html
        )
      `)
      .eq('id', params.scanId1)
      .single(),
    supabase
      .from('scans')
      .select(`
        id,
        status,
        started_at,
        finished_at,
        total_violations,
        passes,
        incomplete,
        inapplicable,
        sites!inner (
          id,
          name,
          url,
          user_id
        ),
        issues (
          id,
          rule,
          selector,
          impact,
          description,
          help_url,
          html
        )
      `)
      .eq('id', params.scanId2)
      .single()
  ])

  if (!scan1 || !scan2) {
    notFound()
  }

  // Verify both scans belong to the same site and user
  if (
    scan1.sites[0]?.user_id !== userId ||
    scan2.sites[0]?.user_id !== userId ||
    scan1.sites[0]?.id !== scan2.sites[0]?.id
  ) {
    notFound()
  }

  // Verify both scans are completed
  if (scan1.status !== 'completed' || scan2.status !== 'completed') {
    notFound()
  }

  // Transform scan data
  const transformedScan1: Scan = {
    ...scan1,
    sites: scan1.sites[0],
    issues: scan1.issues || []
  }

  const transformedScan2: Scan = {
    ...scan2,
    sites: scan2.sites[0],
    issues: scan2.issues || []
  }

  // Ensure scan1 is the older scan
  const [oldScan, newScan] = new Date(transformedScan1.started_at) < new Date(transformedScan2.started_at)
    ? [transformedScan1, transformedScan2]
    : [transformedScan2, transformedScan1]

  // Compare violations
  const diff = diffViolations(oldScan.issues, newScan.issues)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <CompareClient
        oldScan={oldScan}
        newScan={newScan}
        diff={diff}
        isPro={session.user.pro || false}
      />
    </div>
  )
} 
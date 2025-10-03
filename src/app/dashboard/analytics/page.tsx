import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ExecutiveDashboard } from '@/app/components/analytics/ExecutiveDashboard'
import { resolveTeamForRequest } from '@/lib/team-resolution'

export const metadata = {
  title: 'Executive Dashboard | Auditvia',
  description: 'AI-powered analytics with forecasts and industry comparisons'
}

export default async function AnalyticsPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Use centralized team resolution
  const resolution = await resolveTeamForRequest(undefined, true)
  
  if (!resolution) {
    console.error('[analytics] Team resolution failed')
    redirect('/dashboard')
  }

  return <ExecutiveDashboard teamId={resolution.teamId} />
}

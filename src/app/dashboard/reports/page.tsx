import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { AIComplianceDashboardWrapper } from './AIComplianceDashboardWrapper'
import { resolveTeamForRequest } from '@/lib/team-resolution'

export default async function ReportsPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Use centralized team resolution (cookie → first membership)
  const resolution = await resolveTeamForRequest(undefined, true)
  
  if (!resolution) {
    console.error('[reports] Team resolution failed')
    redirect('/dashboard')
  }

  const teamId = resolution.teamId

  // Get sites for this team
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('team_id', teamId)
    .order('name')

  return (
    <AIComplianceDashboardWrapper
      teamId={teamId}
      sites={sites || []}
    />
  )
}
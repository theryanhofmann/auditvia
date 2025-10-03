import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { FixCenterClient } from '@/app/components/violations/FixCenterClient'
import { resolveTeamForRequest } from '@/lib/team-resolution'

export default async function ViolationsPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Use centralized team resolution
  const resolution = await resolveTeamForRequest(undefined, true)
  
  if (!resolution) {
    console.error('[violations] Team resolution failed')
    redirect('/dashboard')
  }

  return <FixCenterClient teamId={resolution.teamId} />
}
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'
import { TeamSettingsClient } from './TeamSettingsClient'
import { redirect } from 'next/navigation'

export default async function TeamSettingsPage({
  params
}: {
  params: { teamId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const supabase = await createClient()

  // Get team and member info
  const { data: teamMember, error: teamError } = await supabase
    .from('team_members')
    .select(`
      role,
      team:teams!inner(
        id,
        name,
        billing_status,
        trial_ends_at,
        stripe_customer_id
      )
    `)
    .eq('team_id', params.teamId)
    .eq('user_id', session.user.id)
    .single()

  if (teamError || !teamMember) {
    redirect('/dashboard')
  }

  // Only allow owners/admins to access settings
  if (teamMember.role !== 'owner' && teamMember.role !== 'admin') {
    redirect(`/dashboard/teams/${params.teamId}`)
  }

  // Get team members
  const { data: members } = await supabase
    .from('team_members')
    .select(`
      id,
      role,
      user:users(
        id,
        name,
        email
      )
    `)
    .eq('team_id', params.teamId)

  return (
    <TeamSettingsClient
      team={(teamMember.team as any)[0] || (teamMember.team as any)}
      members={(members || []).map((member: any) => ({
        ...member,
        user: member.user[0] || member.user
      }))}
      currentUserRole={teamMember.role}
    />
  )
} 
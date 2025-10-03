import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/app/lib/supabase/server'
import { TeamSettingsClient } from './TeamSettingsClient'
import { redirect } from 'next/navigation'

export default async function TeamSettingsPage({
  params: paramsPromise
}: {
  params: Promise<{ teamId: string }>
}) {
  const params = await paramsPromise
  const { teamId } = params
  
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect('/auth/signin')
  }

  console.log('🔍 [team-settings] Starting membership check:', {
    teamId,
    userId: session.user.id,
    userEmail: session.user.email
  })

  // Use admin client to bypass RLS for team settings access
  // Get team membership first (only guaranteed columns)
  const { data: teamMember, error: memberError } = await supabaseAdmin
    .from('team_members')
    .select('role, team_id, user_id, id')
    .eq('team_id', teamId)
    .eq('user_id', session.user.id)
    .maybeSingle() // Changed to maybeSingle to avoid error on 0 rows

  console.log('🔍 [team-settings] Membership query result:', {
    found: !!teamMember,
    data: teamMember,
    error: memberError
  })

  // If no membership, debug: check all memberships for this user
  if (!teamMember) {
    const { data: allUserMemberships } = await supabaseAdmin
      .from('team_members')
      .select('team_id, user_id, role')
      .eq('user_id', session.user.id)
    
    console.error('🔍 [team-settings] No membership found. User\'s all memberships:', {
      count: allUserMemberships?.length || 0,
      memberships: allUserMemberships
    })

    // Also check if team exists at all
    const { data: teamCheck } = await supabaseAdmin
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single()
    
    console.error('🔍 [team-settings] Team exists?', !!teamCheck, teamCheck)
  }

  if (memberError || !teamMember) {
    console.error('Team settings access denied:', memberError)
    redirect('/dashboard')
  }

  // Get team details separately (only guaranteed columns)
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id, name')
    .eq('id', teamId)
    .single()

  if (teamError || !team) {
    console.error('Team not found:', teamError)
    redirect('/dashboard')
  }

  // Try to get billing columns if they exist (optional, may fail on legacy schema)
  let billingStatus = 'free'
  let trialEndsAt = null
  let stripeCustomerId = null

  try {
    const { data: billingData, error: billingError } = await supabaseAdmin
      .from('teams')
      .select('billing_status, trial_ends_at, stripe_customer_id')
      .eq('id', teamId)
      .maybeSingle() // Use maybeSingle() instead of single() to handle 0 or 1 rows gracefully
    
    console.log('Billing query result:', { data: billingData, error: billingError })
    
    if (billingData && !billingError) {
      billingStatus = billingData.billing_status || 'free'
      trialEndsAt = billingData.trial_ends_at
      stripeCustomerId = billingData.stripe_customer_id
    }
  } catch (error) {
    console.log('Billing columns not available (expected for new schema):', error)
    // Continue with defaults - billing features will show upgrade prompts
  }
  
  console.log('Team settings loaded successfully for team:', teamId)

  // Only allow owners/admins to access settings
  if (teamMember.role !== 'owner' && teamMember.role !== 'admin') {
    redirect(`/dashboard/teams/${teamId}`)
  }

  // Get team members
  const { data: members, error: membersError } = await supabaseAdmin
    .from('team_members')
    .select(`
      id,
      role,
      user_id,
      users!inner(
        id,
        name,
        email
      )
    `)
    .eq('team_id', teamId)
  
  console.log('Team members query result:', { 
    count: members?.length, 
    error: membersError,
    sample: members?.[0] 
  })

  return (
    <TeamSettingsClient
      team={{
        id: team.id,
        name: team.name,
        billing_status: billingStatus as 'free' | 'trial' | 'pro',
        trial_ends_at: trialEndsAt,
        stripe_customer_id: stripeCustomerId,
      }}
      members={(members || []).map((member: any) => {
        // Handle both array and object responses from Supabase
        const userData = Array.isArray(member.users) ? member.users[0] : member.users
        return {
          id: member.id,
          role: member.role,
          user: userData || { id: member.user_id, name: null, email: null }
        }
      })}
      currentUserRole={teamMember.role}
    />
  )
} 
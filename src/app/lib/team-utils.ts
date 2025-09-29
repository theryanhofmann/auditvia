import { cookies } from 'next/headers'
import { createClient } from '@/app/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import crypto from 'crypto'

const TEAM_COOKIE_NAME = 'teamId'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

interface TeamResult {
  teamId: string
  created: boolean
}

/**
 * Gets the current team ID for the authenticated user.
 * Priority: cookie value (if user is member) → first team membership → create default team
 */
export async function getCurrentTeamId(): Promise<TeamResult | null> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      console.log('🔍 [team-resolve] phase=auth-check user=none result=unauthenticated')
      return null
    }

    const githubUserId = session.user.id
    console.log('🔍 [team-resolve] phase=start user=%s', githubUserId)

    const supabase = await createClient()
    
    // Get user's database ID using service role to bypass RLS issues
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Upsert user record - this handles both creation and updates idempotently
    const { data: user, error: upsertError } = await supabaseAdmin
      .from('users')
      .upsert({
        github_id: session.user.id,
        email: session.user.email!,
        name: session.user.name,
        avatar_url: session.user.image,
        last_login_at: new Date().toISOString()
      }, {
        onConflict: 'email', // Use email as the conflict resolution key
        ignoreDuplicates: false // Update existing records
      })
      .select('id, github_id, email, name')
      .single()

    if (upsertError || !user) {
      console.error('🔍 [team-resolve] phase=user-upsert-failed user=%s error=%s', githubUserId, upsertError?.message || 'no user returned')
      return null
    }

    console.log('🔍 [team-resolve] phase=user-resolved user=%s dbUserId=%s email=%s', githubUserId, user.id, user.email)

    const userId = user.id
    console.log('🔍 [team-resolve] phase=user-found user=%s dbUserId=%s', githubUserId, userId)

    // Check cookie for saved team preference
    const cookieStore = await cookies()
    const savedTeamId = cookieStore.get(TEAM_COOKIE_NAME)?.value
    console.log('🔍 [team-resolve] phase=cookie-check user=%s cookie=%s', githubUserId, savedTeamId ? 'present' : 'none')

    if (savedTeamId) {
      // Verify user is still a member of the saved team
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('team_id', savedTeamId)
        .eq('user_id', userId)
        .single()

      if (membership) {
        console.log('🔍 [team-resolve] phase=cookie-valid user=%s chosenTeam=%s source=cookie created=false', githubUserId, savedTeamId)
        return { teamId: savedTeamId, created: false }
      } else {
        console.log('🔍 [team-resolve] phase=cookie-invalid user=%s invalidTeam=%s', githubUserId, savedTeamId)
      }
    }

    // Get user's team memberships, ordered by join date (oldest first)
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('team_members')
      .select('team_id, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true })

    if (membershipsError) {
      console.error('🔍 [team-resolve] phase=memberships-error user=%s error=%s', githubUserId, membershipsError.message)
      return null
    }

    const membershipCount = memberships?.length || 0
    console.log('🔍 [team-resolve] phase=memberships-found user=%s memberships=%d', githubUserId, membershipCount)

    // If user has existing teams, return the first one
    if (memberships && memberships.length > 0) {
      const teamId = memberships[0].team_id
      await setCurrentTeamId(teamId) // Update cookie
      console.log('🔍 [team-resolve] phase=membership-selected user=%s chosenTeam=%s source=first-membership created=false', githubUserId, teamId)
      return { teamId, created: false }
    }

    // User has no teams - create a default team
    console.log('🔍 [team-resolve] phase=no-memberships user=%s creating=default-team', githubUserId)
    
    const teamId = crypto.randomUUID()
    const teamName = session.user.name ? `${session.user.name}'s Team` : 'My Team'

    // Check if user already has a default team (idempotent check)
    const { data: existingTeam } = await supabaseAdmin
      .from('teams')
      .select('id, name')
      .eq('created_by', userId)
      .limit(1)
      .single()

    if (existingTeam) {
      console.log('🔍 [team-resolve] phase=existing-team-found user=%s teamId=%s', githubUserId, existingTeam.id)
      await setCurrentTeamId(existingTeam.id)
      return { teamId: existingTeam.id, created: false }
    }

    // Create team (trigger will automatically create membership)
    const { data: newTeam, error: teamError } = await supabaseAdmin
      .from('teams')
      .insert({
        id: teamId,
        name: teamName,
        created_by: userId
      })
      .select('id')
      .single()

    if (teamError) {
      console.error('🔍 [team-resolve] phase=team-creation-error user=%s error=%s', githubUserId, teamError.message)
      
      // If team creation failed due to duplicate, try to find existing team
      const { data: fallbackTeam } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('created_by', userId)
        .limit(1)
        .single()
      
      if (fallbackTeam) {
        console.log('🔍 [team-resolve] phase=team-fallback-found user=%s teamId=%s', githubUserId, fallbackTeam.id)
        await setCurrentTeamId(fallbackTeam.id)
        return { teamId: fallbackTeam.id, created: false }
      }
      
      return null
    }

    // Verify membership was created by trigger
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (!membership) {
      console.warn('🔍 [team-resolve] phase=manual-membership user=%s teamId=%s', githubUserId, teamId)
      await supabase
        .from('team_members')
        .insert({
          id: crypto.randomUUID(),
          team_id: teamId,
          user_id: userId,
          role: 'owner'
        })
    }

    await setCurrentTeamId(teamId) // Set cookie
    console.log('🔍 [team-resolve] phase=team-created user=%s chosenTeam=%s source=default-team created=true teamName=%s', githubUserId, teamId, teamName)
    
    return { teamId, created: true }

  } catch (error) {
    console.error('Error in getCurrentTeamId:', error)
    return null
  }
}

/**
 * Sets the current team ID in an HTTP-only cookie
 */
export async function setCurrentTeamId(teamId: string): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.set(TEAM_COOKIE_NAME, teamId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/'
    })
  } catch (error) {
    console.error('Error setting team cookie:', error)
  }
}

/**
 * Clears the current team ID cookie
 */
export async function clearCurrentTeamId(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(TEAM_COOKIE_NAME)
  } catch (error) {
    console.error('Error clearing team cookie:', error)
  }
}

/**
 * Validates that a user is a member of the specified team
 */
export async function validateTeamMembership(teamId: string, userId?: string): Promise<boolean> {
  try {
    if (!userId) {
      const session = await auth()
      if (!session?.user?.id) return false
      
      // Use service role to bypass RLS issues
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('github_id', session.user.id)
        .single()
      
      if (!user) return false
      userId = user.id
    }

    // Use service role to bypass RLS issues
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    return !!membership
  } catch (error) {
    console.error('Error validating team membership:', error)
    return false
  }
}

/**
 * Idempotent user and team resolver
 * 
 * This module provides a single function that:
 * 1. Upserts the current authenticated user by email
 * 2. Ensures they have a default team (creates if needed)
 * 3. Ensures team membership exists
 * 4. All operations are idempotent and transactional
 */

import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'
import type { Database } from '@/app/types/database'
import crypto from 'crypto'

interface ResolverResult {
  userId: string
  teamId: string
  teamName: string
  created: {
    user: boolean
    team: boolean
    membership: boolean
  }
}

interface AuthUser {
  id: string // App UUID (normalized in NextAuth callbacks)
  email: string
  name?: string | null
  image?: string | null
}

/**
 * Resolves the current authenticated user and ensures they have a team
 * This function is idempotent and can be called safely multiple times
 */
export async function resolveCurrentUserAndTeam(): Promise<ResolverResult | null> {
  try {
    // Get current authenticated session
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      console.error('🔧 [resolver] No authenticated session or missing email')
      return null
    }

    const authUser: AuthUser = {
      id: session.user.id, // This is now the app UUID from NextAuth callbacks
      email: session.user.email,
      name: session.user.name,
      image: session.user.image
    }

    console.log('🔧 [resolver] Starting resolution for user:', authUser.email, 'appUserId:', authUser.id)

    // Use service role client to bypass RLS issues
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Step 1: Verify user exists - handle both UUID and GitHub ID formats
    let user = null
    const isUuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(authUser.id)
    
    console.log('🔧 [resolver] User ID format check:', {
      userId: authUser.id,
      isUUID: isUuidFormat,
      length: authUser.id.length
    })

    if (isUuidFormat) {
      // Try UUID lookup first (new way)
      const { data: userByUuid, error: uuidError } = await supabase
        .from('users')
        .select('id, github_id, email')
        .eq('id', authUser.id)
        .single()

      if (userByUuid && !uuidError) {
        user = userByUuid
        console.log('🔧 [resolver] User found by app UUID:', user.id)
      } else {
        console.error('🔧 [resolver] UUID lookup failed:', uuidError?.message)
      }
    } 
    
    if (!user) {
      // Try GitHub ID lookup (fallback/transition)
      console.log('🔧 [resolver] Trying GitHub ID lookup for:', authUser.id)
      
      const { data: userByGithub, error: githubError } = await supabase
        .from('users')
        .select('id, github_id, email')
        .eq('github_id', authUser.id)
        .single()

      if (userByGithub && !githubError) {
        user = userByGithub
        console.warn('🔧 [resolver] Found user by GitHub ID (transition period):', user.id)
      } else {
        console.log('🔧 [resolver] GitHub ID lookup failed, creating new user')
        
        // Create new user
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            github_id: authUser.id,
            referral_code: crypto.randomUUID()
          })
          .select('id, github_id, email')
          .single()

        if (newUser && !createError) {
          user = newUser
          console.log('🔧 [resolver] Created new user:', user.id)
        } else {
          console.error('🔧 [resolver] Failed to create user:', createError?.message)
          return null
        }
      }
    }

    console.log('🔧 [resolver] User found:', { 
      appUserId: user.id, 
      githubId: user.github_id,
      email: user.email 
    })

    // Step 2: Find or create default team for this user
    // First check if user already has a team they own
    const { data: existingTeams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('created_by', user.id)
      .limit(1)

    let teamId: string
    let teamName: string
    let teamCreated = false

    if (existingTeams && existingTeams.length > 0) {
      // User already has a team
      teamId = existingTeams[0].id
      teamName = existingTeams[0].name
      console.log('🔧 [resolver] Existing team found:', { teamId, teamName })
    } else {
      // Create a new team for the user
      teamId = crypto.randomUUID()
      teamName = authUser.name ? `${authUser.name}'s Team` : 'My Team'

      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          id: teamId,
          name: teamName,
          created_by: user.id
        })
        .select('id, name')
        .single()

      if (teamError) {
        // If team creation failed due to race condition, try to find existing team
        console.warn('🔧 [resolver] Team creation failed, checking for existing:', teamError.message)
        
        const { data: fallbackTeam } = await supabase
          .from('teams')
          .select('id, name')
          .eq('created_by', user.id)
          .limit(1)
          .single()

        if (fallbackTeam) {
          teamId = fallbackTeam.id
          teamName = fallbackTeam.name
          console.log('🔧 [resolver] Fallback team found:', { teamId, teamName })
        } else {
          console.error('🔧 [resolver] Team creation and fallback both failed')
          return null
        }
      } else {
        teamCreated = true
        console.log('🔧 [resolver] New team created:', { teamId, teamName })
      }
    }

    // Step 3: Ensure team membership exists
    console.log('🔧 [resolver] Ensuring membership for user:', user.id, 'in team:', teamId)
    
    // First check if membership already exists
    const { data: existingMembership } = await supabase
      .from('team_members')
      .select('id, role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    let membershipCreated = false
    if (existingMembership) {
      console.log('🔧 [resolver] Existing membership found:', existingMembership.id, 'role:', existingMembership.role)
    } else {
      // Create membership
      console.log('🔧 [resolver] No existing membership, creating new one')
      
      const { data: newMembership, error: createError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: user.id,
          role: 'owner'
        })
        .select('id')
        .single()

      if (createError) {
        console.error('🔧 [resolver] Failed to create membership:', createError.message)
        
        // Double-check if it exists (race condition)
        const { data: recheckMembership } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', user.id)
          .single()
          
        if (!recheckMembership) {
          console.error('🔧 [resolver] Membership creation failed definitively')
          return null
        }
        console.log('🔧 [resolver] Membership exists after race condition check')
      } else {
        membershipCreated = true
        console.log('🔧 [resolver] Membership created successfully:', newMembership?.id)
      }
    }

    console.log('🔧 [resolver] Resolution complete:', {
      userId: user.id,
      teamId,
      teamName,
      created: { user: false, team: teamCreated, membership: membershipCreated }
    })

    return {
      userId: user.id,
      teamId,
      teamName,
      created: {
        user: false, // User already exists from NextAuth callback
        team: teamCreated,
        membership: membershipCreated
      }
    }

  } catch (error) {
    console.error('🔧 [resolver] Unexpected error:', error)
    console.error('🔧 [resolver] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return null
  }
}

/**
 * Simplified version that only returns team info (for API compatibility)
 */
export async function getCurrentTeamInfo(): Promise<{ teamId: string; teamName: string } | null> {
  const result = await resolveCurrentUserAndTeam()
  if (!result) return null
  
  return {
    teamId: result.teamId,
    teamName: result.teamName
  }
}

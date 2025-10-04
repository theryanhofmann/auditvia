/**
 * Centralized Team Resolution Utility
 * 
 * Single source of truth for resolving which team a request should use.
 * Priority: URL/query param → cookie → first membership
 */

import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'

const TEAM_COOKIE_NAME = 'teamId'

export interface TeamResolutionResult {
  /** Resolved team ID */
  teamId: string
  /** App user ID (UUID from users table) */
  userId: string
  /** Source of resolution */
  source: 'url' | 'cookie' | 'first_membership' | 'created'
  /** User's role in the team */
  role: string
  /** Whether this team was just created */
  created: boolean
}

export interface TeamResolutionDebug {
  userId: string
  requestedTeamId?: string
  cookieTeamId?: string
  resolvedTeamId: string
  source: string
  allowed: boolean
  denyReason?: string
}

/**
 * Resolve the effective team ID for the current request
 * 
 * @param requestedTeamId - Optional team ID from URL or query params
 * @param requireMembership - If true, verify user is a member
 * @returns Resolved team info or null if resolution fails
 */
export async function resolveTeamForRequest(
  requestedTeamId?: string,
  requireMembership: boolean = true
): Promise<TeamResolutionResult | null> {
  try {
    // 1. Get session
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      console.log('[team-resolve] No session')
      return null
    }

    const supabase = createServiceClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Get/upsert user record
    // Try upsert first, but if it fails due to duplicate, fetch existing user
    let userId: string | null = null
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        github_id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        avatar_url: session.user.image,
        last_login_at: new Date().toISOString()
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select('id')
      .single()

    if (user) {
      userId = user.id
    } else if (userError?.code === '23505') {
      // Duplicate key - user already exists, fetch them
      console.log('[team-resolve] User already exists, fetching...', {
        github_id: session.user.id,
        email: session.user.email
      })
      
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email!)
        .single()
      
      if (existingUser) {
        userId = existingUser.id
      }
    }

    if (!userId) {
      console.error('[team-resolve] Could not resolve user:', userError)
      return null
    }

    // 3. Check cookie
    const cookieStore = await cookies()
    const cookieTeamId = cookieStore.get(TEAM_COOKIE_NAME)?.value

    // 4. Resolve team ID (priority: requested → cookie → first membership)
    let teamId: string | null = null
    let source: TeamResolutionResult['source'] = 'first_membership'
    let created = false

    // Try requested team first
    if (requestedTeamId) {
      console.log('[team-resolve] Checking requested team:', { requestedTeamId, userId })
      
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', requestedTeamId)
        .eq('user_id', userId)
        .single()

      console.log('[team-resolve] Membership check result:', {
        found: !!membership,
        role: membership?.role,
        error: membershipError?.message
      })

      if (membership) {
        teamId = requestedTeamId
        source = 'url'
      }
    }

    // Try cookie if no requested team or requested team invalid
    if (!teamId && cookieTeamId) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', cookieTeamId)
        .eq('user_id', userId)
        .single()

      if (membership) {
        teamId = cookieTeamId
        source = 'cookie'
      }
    }

    // Try first membership if still no team
    if (!teamId) {
      const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true })
        .limit(1)

      if (memberships && memberships.length > 0) {
        teamId = memberships[0].team_id
        source = 'first_membership'
      }
    }

    // Create default team if user has none
    if (!teamId) {
      const newTeamId = crypto.randomUUID()
      const teamName = session.user.name ? `${session.user.name}'s Team` : 'My Team'

      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          id: newTeamId,
          name: teamName,
          created_by: userId
        })
        .select('id')
        .single()

      if (teamError) {
        console.error('[team-resolve] Team creation failed:', teamError)
        return null
      }

      // Verify membership was created by trigger
      const { data: membership } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', newTeamId)
        .eq('user_id', userId)
        .single()

      if (!membership) {
        // Manual membership creation as fallback
        await supabase.from('team_members').insert({
          id: crypto.randomUUID(),
          team_id: newTeamId,
          user_id: userId,
          role: 'owner'
        })
      }

      teamId = newTeamId
      source = 'created'
      created = true
    }

    // 5. Null check for teamId
    if (!teamId) {
      console.error('[team-resolve] Failed to resolve team ID')
      return null
    }

    // 6. Get membership role
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (requireMembership && !membership) {
      console.error('[team-resolve] User not member of resolved team')
      return null
    }

    return {
      teamId,
      userId,
      source,
      role: membership?.role || 'member',
      created
    }

  } catch (error) {
    console.error('[team-resolve] Error:', error)
    return null
  }
}

/**
 * Debug logger for team resolution
 * Logs all relevant IDs for troubleshooting 403s
 */
export function logTeamResolution(
  endpoint: string,
  debug: TeamResolutionDebug
): void {
  console.log(`[team-access] ${endpoint}`, {
    userId: debug.userId,
    requested: debug.requestedTeamId || 'none',
    cookie: debug.cookieTeamId || 'none',
    resolved: debug.resolvedTeamId,
    source: debug.source,
    decision: debug.allowed ? 'ALLOW' : 'DENY',
    reason: debug.denyReason
  })
}

/**
 * Get cookie team ID (for debugging)
 */
export async function getCookieTeamId(): Promise<string | undefined> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(TEAM_COOKIE_NAME)?.value
  } catch {
    return undefined
  }
}


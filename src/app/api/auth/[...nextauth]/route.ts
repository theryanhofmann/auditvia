import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import type { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import NextAuth from "next-auth"
import crypto from 'crypto'
import { setCurrentTeamId } from '@/app/lib/team-utils'
import { validateAuthEnvironment } from '@/app/lib/env-validation'

// Validate environment variables at startup
validateAuthEnvironment()

interface OnboardingResult {
  success: boolean
  userData?: any
  error?: string
}

/**
 * Executes the complete onboarding flow atomically:
 * 1. Create/update user record
 * 2. Create default team if needed  
 * 3. Ensure team membership exists
 */
async function executeOnboarding(
  supabase: ReturnType<typeof createClient<Database>>, 
  user: any
): Promise<OnboardingResult> {
  try {
    console.log('🚀 Starting atomic onboarding for:', { email: user.email, githubId: user.id })

    // Step 1: Upsert user record (idempotent)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, name, avatar_url, referral_code, referral_credits')
      .eq('github_id', user.id)
      .single()

    const userId = existingUser?.id || crypto.randomUUID()
    
    const upsertData = {
      id: userId,
      github_id: user.id,
      email: user.email,
      name: user.name || existingUser?.name || null,
      avatar_url: user.image || existingUser?.avatar_url || null,
      updated_at: new Date().toISOString()
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert(upsertData, { onConflict: 'github_id' })
      .select('id, email, name, referral_code, referral_credits')
      .single()

    if (userError || !userData) {
      return { success: false, error: `User upsert failed: ${userError?.message}` }
    }

    console.log('✅ User record ready:', userData.id)

    // Step 2: Check for existing team membership (idempotent check)
    const { data: existingMemberships, error: membershipCheckError } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', userData.id)

    if (membershipCheckError) {
      console.warn('⚠️ Could not check team memberships:', membershipCheckError.message)
      // Continue with user data even if team check fails
      return { success: true, userData, error: 'Team membership check failed but user created' }
    }

    // Step 3: Create default team and membership if needed (idempotent)
    if (!existingMemberships?.length) {
      console.log('👥 Creating default team for user:', userData.id)
      
      const teamName = userData.name ? `${userData.name}'s Team` : 'My Team'
      const teamId = crypto.randomUUID()
      
      // Create team (will trigger automatic membership via DB trigger)
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          id: teamId,
          name: teamName,
          created_by: userData.id
        })
        .select('id, name')
        .single()

      if (teamError) {
        console.warn('⚠️ Team creation failed:', teamError.message)
        // Return success with user data, team creation can be retried later
        return { success: true, userData, error: 'Team creation failed but user ready' }
      }

      console.log('✅ Default team created:', { teamId: newTeam.id, name: newTeam.name })
      
      // Verify team membership was created by trigger
      const { data: membership } = await supabase
        .from('team_members')
        .select('id, role')
        .eq('team_id', teamId)
        .eq('user_id', userData.id)
        .single()

      if (!membership) {
        console.warn('⚠️ Team membership not created by trigger, manually creating...')
        await supabase
          .from('team_members')
          .insert({
            id: crypto.randomUUID(),
            team_id: teamId,
            user_id: userData.id,
            role: 'owner'
          })
      }

      // Set this as the current team
      await setCurrentTeamId(teamId)
    } else {
      console.log('✅ User already has team membership:', existingMemberships.length)
      
      // Set the first team as current if no cookie is set
      const firstTeamId = existingMemberships[0].team_id
      await setCurrentTeamId(firstTeamId)
    }

    return { success: true, userData }

  } catch (error) {
    console.error('💥 Onboarding error:', error)
    return { success: false, error: `Unexpected error: ${error}` }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email'
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  logger: {
    error(code, metadata) { console.error('NextAuth error', code, metadata); },
    warn(code) { console.warn('NextAuth warn', code); },
    debug(code, metadata) { console.debug('NextAuth debug', code, metadata); },
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        console.error('GitHub login failed: No email provided')
        return false
      }

      try {
        // Use service role for auth operations
        const supabase = createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        console.log('Starting onboarding for GitHub user:', { email: user.email, githubId: user.id })

        // Execute atomic onboarding flow
        const result = await executeOnboarding(supabase, user)
        
        if (result.success && result.userData) {
          // Update session with app user data
          user.id = result.userData.id
          user.referral_code = result.userData.referral_code
          user.referral_credits = result.userData.referral_credits
          
          if (result.error) {
            console.warn('⚠️ Onboarding completed with warnings:', result.error)
          } else {
            console.log('✅ Complete onboarding success for user:', result.userData.id)
          }
          return true
        } else {
          // Try graceful degradation - at least get user record
          console.warn('⚠️ Primary onboarding failed, attempting fallback:', result.error)
          
          const { data: fallbackUser } = await supabase
            .from('users')
            .select('id, referral_code, referral_credits')
            .eq('github_id', user.id)
            .single()
          
          if (fallbackUser) {
            user.id = fallbackUser.id
            user.referral_code = fallbackUser.referral_code
            user.referral_credits = fallbackUser.referral_credits
            console.log('✅ Fallback auth successful, user can complete setup later')
            return true
          }
          
          console.error('❌ Complete onboarding failure, blocking auth:', result.error)
          return false
        }
      } catch (error) {
        console.error('❌ Unexpected error in signIn callback:', error)
        return false
      }
    },

    async session({ session, token }) {
      if (session?.user) {
        // Always use the app UUID, never GitHub ID
        session.user.id = token.userId as string || token.sub as string // Fallback to sub for compatibility
        session.user.referral_code = token.referral_code as string
        session.user.referral_credits = token.referral_credits as number
        
        console.log('🔑 [session] Session normalized - userId (app UUID):', session.user.id)
        
        // Show referral toast if present
        if (token.referrerName) {
          session.user.referrerName = token.referrerName as string
        }
      }
      return session
    },

    async jwt({ token, account, user }) {
      // On sign-in, normalize the identifiers
      if (account && user) {
        console.log('🔑 [jwt] Sign-in detected, normalizing identifiers')
        console.log('🔑 [jwt] GitHub ID (from account):', account.providerAccountId)
        console.log('🔑 [jwt] Current user.id (should be app UUID):', user.id)
        
        // Store both GitHub ID and app UUID separately
        token.githubId = account.providerAccountId // String GitHub ID
        token.userId = user.id // App UUID from onboarding
        token.referral_code = user.referral_code
        token.referral_credits = user.referral_credits
        token.referrerName = user.referrerName
        
        console.log('🔑 [jwt] Stored in token - githubId:', token.githubId, 'userId:', token.userId)
      }
      
      if (user) {
        // Preserve existing behavior for updates
        token.referral_code = user.referral_code
        token.referral_credits = user.referral_credits
        token.referrerName = user.referrerName
      }
      return token
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin'
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 
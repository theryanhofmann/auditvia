import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import type { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import NextAuth from "next-auth"
import crypto from 'crypto'

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
  callbacks: {
    async signIn({ user, account, profile }) {
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

        // Step 1: Upsert user record
        console.log('Upserting user:', { email: user.email, githubId: user.id })
        // First try to get existing user
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email, name, avatar_url')
          .eq('github_id', user.id)
          .single()

        // Generate a UUID for new users
        const userId = existingUser?.id || crypto.randomUUID()

        // Prepare upsert data, preserving existing values if new ones are null
        const upsertData = {
          id: userId, // Use existing ID or new UUID
          github_id: user.id,
          email: user.email,
          name: user.name || existingUser?.name || null,
          avatar_url: user.image || existingUser?.avatar_url || null,
          updated_at: new Date().toISOString()
        }

        console.log('Upserting user with data:', { ...upsertData, userId })

        const { data: userData, error: userError } = await supabase
          .from('users')
          .upsert(upsertData, {
            onConflict: 'github_id'
          })
          .select('id, email, name, referral_code, referral_credits')
          .single()

        if (userError) {
          console.error('Failed to upsert user:', userError)
          return false
        }

        if (!userData) {
          console.error('No user data returned after upsert')
          return false
        }

        console.log('User upserted successfully:', { userId: userData.id })

        // Step 2: Check for existing teams
        const { data: teams, error: teamsError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', userData.id)

        if (teamsError) {
          console.error('Failed to check existing teams:', teamsError)
          return false
        }

        // Step 3: Create default team if needed
        if (!teams?.length) {
          console.log('Creating default team for user:', userData.id)
          const teamName = userData.name ? `${userData.name}'s Team` : 'My Team'
          
          const { data: newTeam, error: teamError } = await supabase
            .from('teams')
            .insert({
              name: teamName,
              created_by: userData.id
            })
            .select()
            .single()

          if (teamError) {
            console.error('Failed to create default team:', teamError)
            return false
          }

          console.log('Default team created:', { teamId: newTeam.id })
        }

        // Step 4: Add session data
        user.id = userData.id // Ensure we use the database ID
        user.referral_code = userData.referral_code
        user.referral_credits = userData.referral_credits

        return true
      } catch (error) {
        console.error('Unexpected error in signIn callback:', error)
        return false
      }
    },

    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub as string
        session.user.referral_code = token.referral_code as string
        session.user.referral_credits = token.referral_credits as number
        
        // Show referral toast if present
        if (token.referrerName) {
          session.user.referrerName = token.referrerName as string
        }
      }
      return session
    },

    async jwt({ token, user }) {
      if (user) {
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
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true
      }
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 
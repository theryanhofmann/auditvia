/**
 * Centralized NextAuth helpers for consistent authentication across the app
 * NextAuth v4 compatible
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

/**
 * Get the current session on the server side
 * Use this in API routes, server components, and middleware
 */
export async function auth() {
  return await getServerSession(authOptions)
}

/**
 * Export authOptions for compatibility
 */
export { authOptions }

/**
 * Client-side auth functions (re-export from next-auth/react)
 */
export { signIn, signOut, useSession } from 'next-auth/react'

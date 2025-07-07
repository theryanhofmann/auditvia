import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/app/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Admin client with service role key for server-side operations
function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please add it to your .env.local file.'
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'Please add your Supabase service role key to .env.local file. ' +
      'Find it in your Supabase project dashboard under Settings → API → service_role secret.'
    )
  }

  return createSupabaseClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Helper function to get the appropriate Supabase client based on DEV_NO_ADMIN flag
export async function getSupabaseClient() {
  if (process.env.DEV_NO_ADMIN === 'true') {
    // In dev mode without admin, use regular client with RLS
    return await createClient()
  }
  
  try {
    // Try to use admin client
    return createSupabaseAdmin()
  } catch {
    // If admin client fails, return null to indicate 503 should be returned
    return null
  }
}

// Helper function to create a 503 response when neither admin nor dev fallback is available
export function createAdminDisabledResponse() {
  return new Response(
    JSON.stringify({ error: "admin client disabled" }),
    { 
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

// Create admin client lazily to avoid startup errors in DEV_NO_ADMIN mode
let _adminClient: any = null

function getAdminClient() {
  if (process.env.DEV_NO_ADMIN === 'true') {
    throw new Error('supabaseAdmin is disabled in DEV_NO_ADMIN mode. Use getSupabaseClient() instead.')
  }
  
  if (!_adminClient) {
    _adminClient = createSupabaseAdmin()
  }
  
  return _adminClient
}

export const supabaseAdmin = new Proxy({} as any, {
  get(target, prop) {
    const client = getAdminClient()
    const value = client[prop]
    
    // Bind methods to the client instance
    if (typeof value === 'function') {
      return value.bind(client)
    }
    
    return value
  }
}) 
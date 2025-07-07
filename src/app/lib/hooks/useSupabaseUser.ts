'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { createClient } from '../supabase/client'
import type { User } from '@supabase/supabase-js'

export function useSupabaseUser() {
  const { data: session, status } = useSession()
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      setSupabaseUser(null)
      setLoading(false)
      return
    }

    async function fetchSupabaseUser() {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Error fetching Supabase user:', error)
          setSupabaseUser(null)
        } else {
          setSupabaseUser(user)
        }
      } catch (error) {
        console.error('Error in fetchSupabaseUser:', error)
        setSupabaseUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSupabaseUser()
  }, [session, status])

  return {
    user: supabaseUser,
    session,
    loading: loading || status === 'loading',
    isAuthenticated: !!session?.user && !!supabaseUser,
  }
} 
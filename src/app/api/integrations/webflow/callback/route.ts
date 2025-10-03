/**
 * Webflow OAuth - Callback Handler
 * Handles OAuth redirect, exchanges code for tokens, stores connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getWebflowSites } from '@/lib/integrations/webflow-client'
import { createClient } from '@supabase/supabase-js'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL('/dashboard?error=unauthorized', process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    // Get OAuth code and state from query params
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the teamId we passed
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('❌ [Webflow] OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/dashboard?error=webflow_${error}`, process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard?error=missing_params', process.env.NEXT_PUBLIC_APP_URL!)
      )
    }

    const teamId = state
    console.log('🔄 [Webflow] Processing OAuth callback:', { teamId, userId: session.user.id })

    // Exchange code for access token
    const tokens = await exchangeCodeForToken(code)
    console.log('✅ [Webflow] Token exchange successful')

    // Get connected Webflow sites
    const sites = await getWebflowSites(tokens.access_token)
    console.log(`📦 [Webflow] Found ${sites.length} sites`)

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Store connection in database (using service role to bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Store team-level connection
    const { data: connection, error: insertError } = await supabase
      .from('platform_connections')
      .insert({
        team_id: teamId,
        site_id: null, // Team-level connection
        platform: 'webflow',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        status: 'connected',
        connection_metadata: {
          sites_count: sites.length,
          sites: sites.map(s => ({
            id: s.id,
            name: s.displayName,
            shortName: s.shortName
          }))
        }
      })
      .select()
      .single()

    if (insertError) {
      // Handle unique constraint violations (connection already exists)
      if (insertError.code === '23505') {
        console.log('🔄 [Webflow] Connection exists, updating...')
        
        const { error: updateError } = await supabase
          .from('platform_connections')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAt,
            status: 'connected',
            last_synced_at: new Date().toISOString(),
            connection_metadata: {
              sites_count: sites.length,
              sites: sites.map(s => ({
                id: s.id,
                name: s.displayName,
                shortName: s.shortName
              }))
            }
          })
          .eq('team_id', teamId)
          .eq('platform', 'webflow')
          .is('site_id', null)

        if (updateError) {
          console.error('❌ [Webflow] Failed to update connection:', updateError)
          return NextResponse.redirect(
            new URL('/dashboard?error=connection_update_failed', process.env.NEXT_PUBLIC_APP_URL!)
          )
        }
      } else {
        console.error('❌ [Webflow] Failed to store connection:', insertError)
        return NextResponse.redirect(
          new URL('/dashboard?error=connection_failed', process.env.NEXT_PUBLIC_APP_URL!)
        )
      }
    }

    console.log('✅ [Webflow] Connection stored successfully')

    // Redirect back to dashboard with success message
    return NextResponse.redirect(
      new URL('/dashboard?success=webflow_connected', process.env.NEXT_PUBLIC_APP_URL!)
    )

  } catch (error) {
    console.error('❌ [Webflow] Callback error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=webflow_callback_failed', process.env.NEXT_PUBLIC_APP_URL!)
    )
  }
}


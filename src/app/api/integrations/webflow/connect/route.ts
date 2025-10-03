/**
 * Webflow OAuth - Initiate Connection
 * Redirects user to Webflow authorization page
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWebflowAuthUrl } from '@/lib/integrations/webflow-client'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user session
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get teamId from query params
    const searchParams = request.nextUrl.searchParams
    const teamId = searchParams.get('teamId')
    
    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      )
    }

    // Generate OAuth URL
    const redirectUri = process.env.NEXT_PUBLIC_APP_URL + '/api/integrations/webflow/callback'
    const authUrl = getWebflowAuthUrl(teamId, redirectUri)

    console.log('🔗 [Webflow] Redirecting to authorization:', { teamId, userId: session.user.id })

    // Redirect to Webflow authorization page
    return NextResponse.redirect(authUrl)

  } catch (error) {
    console.error('❌ [Webflow] Connection error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Webflow connection' },
      { status: 500 }
    )
  }
}


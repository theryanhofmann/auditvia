/**
 * Webflow Connection Status API
 * Check if Webflow is connected for a team
 */

import { NextRequest, NextResponse } from 'next/server'
import { getWebflowConnection } from '@/lib/integrations/webflow-client'
import { auth } from '@/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const teamId = searchParams.get('teamId')
    
    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }

    const connection = await getWebflowConnection(teamId)

    return NextResponse.json({
      connected: !!connection,
      connection: connection ? {
        id: connection.id,
        status: connection.status,
        platform_site_id: connection.platform_site_id
      } : null
    })

  } catch (error) {
    console.error('❌ [Webflow] Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { teamId } = await request.json()
    
    if (!teamId) {
      return NextResponse.json({ error: 'teamId is required' }, { status: 400 })
    }

    // Import here to avoid circular dependency
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Delete connection
    const { error } = await supabase
      .from('platform_connections')
      .delete()
      .eq('team_id', teamId)
      .eq('platform', 'webflow')

    if (error) {
      console.error('❌ [Webflow] Failed to delete connection:', error)
      return NextResponse.json(
        { error: 'Failed to disconnect' },
        { status: 500 }
      )
    }

    console.log('✅ [Webflow] Connection deleted:', { teamId })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ [Webflow] Disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}


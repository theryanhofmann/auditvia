import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { auth } from '@/auth'
import { requireProFeature } from '@/lib/pro-features'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  console.log('🔔 [monitoring] Updating monitoring status for site:', params.siteId)
  
  // Verify authentication
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 }
    )
  }

  try {
    const { enabled } = await request.json()
    console.log('🔔 [monitoring] Setting monitoring enabled:', enabled)

    const supabase = await createClient()

    // Get site with team details
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select(`
        id,
        name,
        url,
        user_id,
        team_id,
        monitoring_enabled,
        teams!inner (
          id,
          name,
          created_by,
          created_at,
          billing_status,
          stripe_customer_id,
          stripe_subscription_id,
          trial_ends_at,
          is_pro
        )
      `)
      .eq('id', params.siteId)
      .single()

    if (siteError || !site) {
      console.error('🔔 [monitoring] Site not found:', siteError)
      return new NextResponse(
        JSON.stringify({ error: 'Site not found' }),
        { status: 404 }
      )
    }

    // Verify ownership through team membership
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', site.team_id)
      .eq('user_id', session.user.id)
      .single()

    if (memberError || !teamMember) {
      console.error('🔔 [monitoring] Access denied:', memberError)
      return new NextResponse(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403 }
      )
    }

    // Check Pro feature access when enabling monitoring
    if (enabled) {
      const team = site.teams[0]
      try {
        requireProFeature(team, 'MONITORING')
        console.log('🔔 [monitoring] Pro access verified for team:', team.name)
      } catch (error) {
        console.error('🔔 [monitoring] Pro feature required:', error)
        return new NextResponse(
          JSON.stringify({ 
            error: 'Pro feature required',
            message: 'Automated monitoring requires a Pro plan. Upgrade to access this feature.',
            feature: 'MONITORING'
          }),
          { status: 403 }
        )
      }
    }

    // Update monitoring status
    const { error: updateError } = await supabase
      .from('sites')
      .update({ 
        monitoring_enabled: enabled,
        // Reset monitoring schedule when enabling
        ...(enabled && {
          next_monitoring_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
        })
      })
      .eq('id', params.siteId)

    if (updateError) {
      console.error('🔔 [monitoring] Error updating monitoring:', updateError)
      return new NextResponse(
        JSON.stringify({ error: 'Failed to update monitoring status' }),
        { status: 500 }
      )
    }

    console.log(`🔔 [monitoring] ✅ Monitoring ${enabled ? 'enabled' : 'disabled'} for site: ${site.name || site.url}`)

    return new NextResponse(
      JSON.stringify({ 
        success: true, 
        monitoring_enabled: enabled,
        site: {
          id: site.id,
          name: site.name,
          url: site.url
        }
      }),
      { status: 200 }
    )
  } catch (error) {
    console.error('🔔 [monitoring] Error processing monitoring update:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400 }
    )
  }
}
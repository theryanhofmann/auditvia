import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { auth } from '@/auth'
import { stripeUtils, testModeHelpers } from '@/lib/stripe'

export async function POST(request: Request) {
  try {
    console.log('💳 [checkout] Starting Pro upgrade checkout flow')
    
    // Verify authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get team ID from request body
    const { teamId } = await request.json()
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    console.log(`💳 [checkout] Processing upgrade for team: ${teamId}`)

    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify team exists and user has permission
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select(`
        role, 
        team:teams!inner(
          id, 
          name, 
          billing_status, 
          stripe_customer_id
        )
      `)
      .eq('team_id', teamId)
      .eq('user_id', session.user.id)
      .single()

    if (teamError || !teamMember) {
      console.error(`💳 [checkout] Team access denied for user ${session.user.id}:`, teamError)
      return NextResponse.json(
        { error: 'Team not found or access denied' },
        { status: 403 }
      )
    }

    if (teamMember.role !== 'owner' && teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only team owners and admins can manage billing' },
        { status: 403 }
      )
    }

    const team = teamMember.team as any

    // Check if team is already on Pro plan
    if (team.billing_status === 'pro') {
      return NextResponse.json(
        { error: 'Team is already on Pro plan' },
        { status: 400 }
      )
    }

    console.log(`💳 [checkout] Creating checkout session for team: ${team.name}`)

    // Create Stripe checkout session
    const checkoutSession = await stripeUtils.createCheckoutSession({
      teamId,
      customerEmail: session.user.email || undefined,
      customerId: team.stripe_customer_id || undefined,
    })

    if (!checkoutSession.url) {
      throw new Error('Failed to create checkout session URL')
    }

    // Log test mode info
    const testBanner = testModeHelpers.getTestModeBanner()
    if (testBanner) {
      console.log(`💳 [checkout] ${testBanner.title}: ${testBanner.description}`)
    }

    console.log(`💳 [checkout] ✅ Checkout session created: ${checkoutSession.id}`)

    return NextResponse.json({ 
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      testMode: testBanner ? true : false,
    })
  } catch (error) {
    console.error('💳 [checkout] Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 
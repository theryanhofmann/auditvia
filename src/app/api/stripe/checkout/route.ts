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
    console.log(`💳 [checkout] Looking up team membership for user: ${session.user.id}, team: ${teamId}`)
    
    // First, verify team membership (without billing fields that might not exist yet)
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select(`
        role,
        team_id
      `)
      .eq('team_id', teamId)
      .eq('user_id', session.user.id)
      .single()
    
    if (teamError || !teamMember) {
      console.error(`💳 [checkout] Team membership not found:`, {
        error: teamError?.message,
        code: teamError?.code,
        teamId,
        userId: session.user.id
      })
      
      // Debug: Check if user exists in team_members at all
      const { data: allMemberships, error: debugError } = await supabase
        .from('team_members')
        .select('team_id, user_id, role')
        .eq('user_id', session.user.id)
      
      console.error(`💳 [checkout] User's all team memberships:`, {
        count: allMemberships?.length || 0,
        memberships: allMemberships,
        debugError: debugError?.message
      })
      
      return NextResponse.json(
        { error: 'Team not found or access denied' },
        { status: 403 }
      )
    }
    
    // Now get team details separately (only guaranteed columns)
    const { data: team, error: teamDetailsError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single()

    if (teamDetailsError || !team) {
      console.error(`💳 [checkout] Team details not found:`, {
        error: teamDetailsError?.message,
        teamId
      })
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    if (teamMember.role !== 'owner' && teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only team owners and admins can manage billing' },
        { status: 403 }
      )
    }

    console.log(`💳 [checkout] Creating checkout session for team: ${team.name}`)
    
    // Try to get Stripe data if columns exist (optional)
    let stripeCustomerId: string | undefined
    let stripeSubscriptionId: string | undefined
    
    try {
      const { data: stripeData } = await supabase
        .from('teams')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('id', teamId)
        .single()
      
      if (stripeData) {
        stripeCustomerId = stripeData.stripe_customer_id || undefined
        stripeSubscriptionId = stripeData.stripe_subscription_id || undefined
        
        if (stripeSubscriptionId) {
          console.log(`💳 [checkout] Team already has subscription: ${stripeSubscriptionId}`)
        }
      }
    } catch (error: any) {
      // Columns don't exist yet, that's fine - we'll create them when subscription is created
      console.log(`💳 [checkout] Stripe columns not available (expected for new schema):`, error.message)
    }

    // Create Stripe checkout session
    const checkoutSession = await stripeUtils.createCheckoutSession({
      teamId,
      customerEmail: session.user.email || undefined,
      customerId: stripeCustomerId,
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
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripeUtils, getBillingStatusFromSubscription, isStripeEvent } from '@/lib/stripe'

// Webhook secret is optional for build
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Supabase client for database operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function handleSubscriptionEvent(subscription: Stripe.Subscription, eventType: string) {
  const customerId = subscription.customer as string
  
  console.log(`🎫 [webhook] Processing ${eventType} for customer: ${customerId}`)

  // Find team by Stripe customer ID
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, name')
    .eq('stripe_customer_id', customerId)
    .single()

  if (teamError || !team) {
    console.error(`🎫 [webhook] Team not found for customer ${customerId}:`, teamError)
    throw new Error(`Team not found for customer: ${customerId}`)
  }

  // Determine billing status from subscription
  const billingStatus = getBillingStatusFromSubscription(subscription)
  
  console.log(`🎫 [webhook] Updating team ${team.id} (${team.name}) to status: ${billingStatus}`)

  // Update team with subscription details
  const { error: updateError } = await supabase
    .from('teams')
    .update({
      billing_status: billingStatus,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
    })
    .eq('id', team.id)

  if (updateError) {
    console.error(`🎫 [webhook] Failed to update team ${team.id}:`, updateError)
    throw new Error(`Failed to update team: ${updateError.message}`)
  }

  console.log(`🎫 [webhook] ✅ Successfully updated team ${team.id} to ${billingStatus}`)
}

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!webhookSecret) {
    return new NextResponse('Stripe webhook not configured', { status: 503 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    console.error('🎫 [webhook] No Stripe signature provided')
    return new NextResponse('Missing Stripe signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripeUtils.verifyWebhookSignature(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    console.log(`🎫 [webhook] Verified event: ${event.type}`)
  } catch (err) {
    console.error('🎫 [webhook] Signature verification failed:', err)
    return new NextResponse(
      `Webhook signature verification failed: ${(err as Error).message}`,
      { status: 400 }
    )
  }

  try {
    // Handle different event types
    if (isStripeEvent.checkoutCompleted(event)) {
      const session = event.data.object
      const teamId = session.metadata?.teamId

      if (!teamId) {
        console.error('🎫 [webhook] No teamId in checkout session metadata')
        return NextResponse.json(
          { error: 'Missing teamId in session metadata' },
          { status: 400 }
        )
      }

      console.log(`🎫 [webhook] Checkout completed for team: ${teamId}`)

      // Update team to Pro status
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          billing_status: 'pro',
          stripe_customer_id: session.customer as string,
        })
        .eq('id', teamId)

      if (updateError) {
        console.error(`🎫 [webhook] Failed to update team ${teamId}:`, updateError)
        return NextResponse.json(
          { error: 'Failed to update team' },
          { status: 500 }
        )
      }

      console.log(`🎫 [webhook] ✅ Team ${teamId} upgraded to Pro`)
    }
    
    else if (isStripeEvent.subscriptionCreated(event) || isStripeEvent.subscriptionUpdated(event)) {
      await handleSubscriptionEvent(event.data.object, event.type)
    }
    
    else if (isStripeEvent.subscriptionDeleted(event)) {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      console.log(`🎫 [webhook] Subscription deleted for customer: ${customerId}`)

      // Find and downgrade team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('stripe_customer_id', customerId)
        .single()

      if (teamError || !team) {
        console.error(`🎫 [webhook] Team not found for deleted subscription:`, teamError)
        return NextResponse.json(
          { error: 'Team not found' },
          { status: 404 }
        )
      }

      // Downgrade team to free
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          billing_status: 'free',
          stripe_subscription_id: null,
        })
        .eq('id', team.id)

      if (updateError) {
        console.error(`🎫 [webhook] Failed to downgrade team ${team.id}:`, updateError)
        return NextResponse.json(
          { error: 'Failed to downgrade team' },
          { status: 500 }
        )
      }

      console.log(`🎫 [webhook] ✅ Team ${team.id} (${team.name}) downgraded to free`)
    }
    
    else if (isStripeEvent.invoiceFailed(event)) {
      const invoice = event.data.object
      console.log(`🎫 [webhook] Invoice payment failed for customer: ${invoice.customer}`)
      // Could implement grace period logic here
    }
    
    else {
      console.log(`🎫 [webhook] Unhandled event type: ${event.type}`)
    }

    return new NextResponse(null, { status: 200 })
  } catch (err) {
    console.error('🎫 [webhook] Processing error:', err)
    return new NextResponse(
      `Webhook processing error: ${(err as Error).message}`,
      { status: 500 }
    )
  }
} 
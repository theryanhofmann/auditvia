import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('Missing Stripe environment variables')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil'
})

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const customerId = subscription.customer as string

  // Get team and check subscription status
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!team) {
    console.error('Team not found for customer:', customerId)
    return
  }

  // Update team billing status based on subscription
  const status = subscription.status
  let billingStatus: 'free' | 'pro' = 'free'

  if (status === 'active' || status === 'trialing') {
    billingStatus = 'pro'
  }

  // Update team billing status
  await supabase
    .from('teams')
    .update({
      billing_status: billingStatus
    })
    .eq('id', team.id)
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return new NextResponse('No signature', { status: 400 })
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const teamId = session.metadata?.teamId

        if (!teamId) {
          console.error('No teamId in session metadata')
          return NextResponse.json(
            { error: 'No teamId in session metadata' },
            { status: 400 }
          )
        }

        // Update team to Pro
        const { error: updateError } = await supabase
          .from('teams')
          .update({
            billing_status: 'pro',
            stripe_customer_id: session.customer as string
          })
          .eq('id', teamId)

        if (updateError) {
          console.error('Error updating team:', updateError)
          return NextResponse.json(
            { error: 'Failed to update team' },
            { status: 500 }
          )
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Find team by Stripe customer ID
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('id')
          .eq('stripe_customer_id', subscription.customer)
          .single()

        if (teamError || !team) {
          console.error('Error finding team:', teamError)
          return NextResponse.json(
            { error: 'Team not found' },
            { status: 404 }
          )
        }

        // Update team to remove Pro status
        const { error: updateError } = await supabase
          .from('teams')
          .update({
            billing_status: 'free'
          })
          .eq('id', team.id)

        if (updateError) {
          console.error('Error updating team:', updateError)
          return NextResponse.json(
            { error: 'Failed to update team' },
            { status: 500 }
          )
        }

        break
      }
    }

    return new NextResponse(null, { status: 200 })
  } catch (err) {
    console.error('Error:', err)
    return new NextResponse(
      'Webhook Error: ' + (err as Error).message,
      { status: 400 }
    )
  }
} 
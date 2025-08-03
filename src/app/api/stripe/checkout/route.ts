import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'
import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-06-30.basil'
})

const PRICE_ID = process.env.STRIPE_PRICE_ID // You'll need to create this in Stripe Dashboard

export async function POST(request: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get team ID from request body
    const { teamId } = await request.json()
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify team exists and user is owner/admin
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role, team:teams!inner(billing_status)')
      .eq('team_id', teamId)
      .eq('user_id', session.user.id)
      .single()

    if (teamError || !teamMember) {
      return NextResponse.json(
        { error: 'Team not found or unauthorized' },
        { status: 403 }
      )
    }

    if (teamMember.role !== 'owner' && teamMember.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only team owners and admins can manage billing' },
        { status: 403 }
      )
    }

    // Check if team is already on Pro plan
    if (teamMember.team.billing_status === 'pro') {
      return NextResponse.json(
        { error: 'Team is already on Pro plan' },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: session.user.email || undefined,
      success_url: `${process.env.NEXTAUTH_URL}/teams/${teamId}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/teams/${teamId}/settings?canceled=true`,
      metadata: {
        teamId // Store team ID for webhook
      }
    })

    if (!checkoutSession.url) {
      throw new Error('Failed to create checkout session')
    }

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Error in POST /api/stripe/checkout:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 
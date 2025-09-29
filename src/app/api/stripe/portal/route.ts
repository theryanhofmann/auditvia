import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createClient } from '@/app/lib/supabase/server';
import { stripeUtils } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    // Get session and validate user is authenticated
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get team ID from request body
    const { teamId } = await request.json()
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = await createClient()

    // Verify team exists and user is owner/admin
    const { data: teamMember, error: teamError } = await supabase
      .from('team_members')
      .select('role, team:teams!inner(stripe_customer_id)')
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

    if (!(teamMember.team as any).stripe_customer_id) {
      return NextResponse.json(
        { error: 'Team does not have a Stripe customer ID' },
        { status: 400 }
      )
    }

    // Create Stripe portal session
    const portalSession = await stripeUtils.createPortalSession(
      (teamMember.team as any).stripe_customer_id,
      `${process.env.NEXT_PUBLIC_APP_URL}/teams/${teamId}/settings?billing=updated`
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
} 
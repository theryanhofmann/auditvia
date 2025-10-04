import Stripe from 'stripe'

// Initialize Stripe with proper API version (optional for build)
export const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
}) : null

// Stripe configuration
export const STRIPE_CONFIG = {
  // Test mode price ID - replace with your actual Stripe price ID
  PRICE_ID: process.env.STRIPE_PRICE_ID || 'price_1234567890abcdef', // You'll need to create this in Stripe Dashboard
  
  // Test mode settings
  IS_TEST_MODE: process.env.NODE_ENV !== 'production',
  
  // URLs
  SUCCESS_URL: (teamId: string) => `${process.env.NEXTAUTH_URL}/dashboard/teams/${teamId}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
  CANCEL_URL: (teamId: string) => `${process.env.NEXTAUTH_URL}/dashboard/teams/${teamId}/settings?canceled=true`,
  
  // Test card numbers for development
  TEST_CARDS: {
    SUCCESS: '4242424242424242',
    DECLINED: '4000000000000002',
    REQUIRES_AUTH: '4000002500003155',
  }
} as const

export type BillingStatus = 'free' | 'trial' | 'pro'

// Utility functions for Stripe operations
export const stripeUtils = {
  /**
   * Create a checkout session for Pro upgrade
   */
  async createCheckoutSession(params: {
    teamId: string
    customerEmail?: string
    customerId?: string
  }) {
    // Development bypass: return a mock checkout URL
    if (!stripe && process.env.NODE_ENV === 'development') {
      console.warn('⚠️ [stripe] Stripe not configured, returning mock checkout URL for development')
      return {
        id: 'cs_test_dev_mock_' + Date.now(),
        url: `${process.env.NEXTAUTH_URL}/dashboard/teams/${params.teamId}/settings?success=true&dev_mock=true&session_id=mock_session_${Date.now()}`,
        customer: null,
        mode: 'subscription' as const,
        status: 'open' as const
      }
    }
    
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
    }
    
    const { teamId, customerEmail, customerId } = params
    
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_CONFIG.PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: STRIPE_CONFIG.SUCCESS_URL(teamId),
      cancel_url: STRIPE_CONFIG.CANCEL_URL(teamId),
      metadata: {
        teamId,
      },
      subscription_data: {
        metadata: {
          teamId,
        },
      },
    }

    // Add customer info
    if (customerId) {
      sessionParams.customer = customerId
    } else if (customerEmail) {
      sessionParams.customer_email = customerEmail
    }

    // Add test mode banner in development
    if (STRIPE_CONFIG.IS_TEST_MODE) {
      sessionParams.payment_intent_data = {
        description: `Pro upgrade for team ${teamId} (TEST MODE)`,
      }
    }

    return await stripe.checkout.sessions.create(sessionParams)
  },

  /**
   * Create a customer portal session for managing subscription
   */
  async createPortalSession(customerId: string, returnUrl: string) {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
    }
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
  },

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
    }
    return await stripe.subscriptions.retrieve(subscriptionId)
  },

  /**
   * Cancel subscription immediately
   */
  async cancelSubscription(subscriptionId: string) {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
    }
    return await stripe.subscriptions.cancel(subscriptionId)
  },

  /**
   * Cancel subscription at period end
   */
  async cancelSubscriptionAtPeriodEnd(subscriptionId: string) {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
    }
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
  },

  /**
   * Reactivate a subscription that was set to cancel
   */
  async reactivateSubscription(subscriptionId: string) {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
    }
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })
  },

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string, secret: string): Stripe.Event {
    if (!stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.')
    }
    return stripe.webhooks.constructEvent(body, signature, secret)
  },

  /**
   * Format price for display
   */
  formatPrice(amountInCents: number, currency = 'usd'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountInCents / 100)
  },
}

// Type guards for Stripe webhook events
export const isStripeEvent = {
  checkoutCompleted: (event: Stripe.Event): event is Stripe.CheckoutSessionCompletedEvent =>
    event.type === 'checkout.session.completed',
    
  subscriptionCreated: (event: Stripe.Event): event is Stripe.CustomerSubscriptionCreatedEvent =>
    event.type === 'customer.subscription.created',
    
  subscriptionUpdated: (event: Stripe.Event): event is Stripe.CustomerSubscriptionUpdatedEvent =>
    event.type === 'customer.subscription.updated',
    
  subscriptionDeleted: (event: Stripe.Event): event is Stripe.CustomerSubscriptionDeletedEvent =>
    event.type === 'customer.subscription.deleted',
    
  invoicePaid: (event: Stripe.Event): event is Stripe.InvoicePaymentSucceededEvent =>
    event.type === 'invoice.payment_succeeded',
    
  invoiceFailed: (event: Stripe.Event): event is Stripe.InvoicePaymentFailedEvent =>
    event.type === 'invoice.payment_failed',
}

// Helper to determine billing status from Stripe subscription
export function getBillingStatusFromSubscription(subscription: Stripe.Subscription): BillingStatus {
  switch (subscription.status) {
    case 'active':
    case 'trialing':
      return 'pro'
    case 'past_due':
    case 'unpaid':
      return 'pro' // Keep pro during grace period
    default:
      return 'free'
  }
}

// Test mode helpers
export const testModeHelpers = {
  /**
   * Get test card info for development
   */
  getTestCardInfo() {
    if (!STRIPE_CONFIG.IS_TEST_MODE) return null
    
    return {
      number: STRIPE_CONFIG.TEST_CARDS.SUCCESS,
      exp_month: 12,
      exp_year: new Date().getFullYear() + 1,
      cvc: '123',
    }
  },

  /**
   * Generate test mode banner text
   */
  getTestModeBanner() {
    if (!STRIPE_CONFIG.IS_TEST_MODE) return null
    
    return {
      title: 'Test Mode Active',
      description: `Use test card ${STRIPE_CONFIG.TEST_CARDS.SUCCESS} to simulate successful payment`,
      type: 'warning' as const,
    }
  },
}

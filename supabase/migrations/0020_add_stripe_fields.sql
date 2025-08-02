-- Add Stripe-related fields to users table
ALTER TABLE users
ADD COLUMN pro boolean DEFAULT false,
ADD COLUMN stripe_customer_id text,
ADD COLUMN stripe_subscription_id text;

-- Add indexes for faster lookups
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX idx_users_stripe_subscription_id ON users(stripe_subscription_id); 
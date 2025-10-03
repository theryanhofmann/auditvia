-- Team billing schema - fixed for idempotency
-- This migration adds billing_status and related fields to teams table

-- Add billing_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'billing_status'
  ) THEN
    ALTER TABLE teams ADD COLUMN billing_status TEXT DEFAULT 'free' CHECK (billing_status IN ('free', 'trial', 'pro'));
  END IF;
END $$;

-- Add trial_ends_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE teams ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add stripe_customer_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN stripe_customer_id TEXT;
  END IF;
END $$;

-- Create indexes for performance (without CONCURRENTLY)
CREATE INDEX IF NOT EXISTS teams_billing_status_idx ON teams(billing_status);
CREATE INDEX IF NOT EXISTS teams_stripe_customer_idx ON teams(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Add comments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'billing_status'
  ) THEN
    COMMENT ON COLUMN teams.billing_status IS 'Team billing status: free, trial, or pro';
  END IF;
END $$;


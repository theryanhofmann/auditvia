-- Add stripe_subscription_id to teams table for proper subscription tracking
-- This enables better subscription management and webhook handling

-- Add stripe_subscription_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN stripe_subscription_id TEXT;
  END IF;
END $$;

-- Add is_pro computed column for easier querying (derived from billing_status)
-- Only add if billing_status column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'is_pro'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'billing_status'
  ) THEN
    ALTER TABLE teams ADD COLUMN is_pro BOOLEAN GENERATED ALWAYS AS (billing_status = 'pro') STORED;
  END IF;
END $$;

-- Add helpful comments (only if columns exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'stripe_subscription_id'
  ) THEN
    COMMENT ON COLUMN teams.stripe_subscription_id IS 'Stripe subscription ID for Pro plan tracking';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'is_pro'
  ) THEN
    COMMENT ON COLUMN teams.is_pro IS 'Computed field: true when billing_status = pro';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'billing_status'
  ) THEN
    COMMENT ON COLUMN teams.billing_status IS 'Team billing status: free, trial, or pro';
  END IF;
END $$;

-- Create index for faster Pro status lookups (without CONCURRENTLY for migrations)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'is_pro'
  ) THEN
    CREATE INDEX IF NOT EXISTS teams_is_pro_idx ON teams(is_pro) WHERE is_pro = true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS teams_stripe_subscription_idx ON teams(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

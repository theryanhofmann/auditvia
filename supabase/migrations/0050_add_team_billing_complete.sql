-- Add complete billing support to teams table
-- This enables Stripe Pro plan management with proper subscription tracking

-- Add billing_status column with proper enum type
DO $$
BEGIN
  -- Create billing_status enum if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_status_enum') THEN
    CREATE TYPE billing_status_enum AS ENUM ('free', 'trial', 'pro');
  END IF;
END $$;

-- Add billing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'billing_status'
  ) THEN
    ALTER TABLE teams ADD COLUMN billing_status billing_status_enum DEFAULT 'free' NOT NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN stripe_customer_id TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE teams ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add is_pro computed column for easier querying
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'is_pro'
  ) THEN
    ALTER TABLE teams ADD COLUMN is_pro BOOLEAN GENERATED ALWAYS AS (billing_status = 'pro') STORED;
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN teams.billing_status IS 'Team billing status: free, trial, or pro';
COMMENT ON COLUMN teams.stripe_customer_id IS 'Stripe customer ID for billing management';
COMMENT ON COLUMN teams.stripe_subscription_id IS 'Stripe subscription ID for Pro plan tracking';
COMMENT ON COLUMN teams.trial_ends_at IS 'When trial period ends (if applicable)';
COMMENT ON COLUMN teams.is_pro IS 'Computed field: true when billing_status = pro';

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS teams_billing_status_idx ON teams(billing_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS teams_is_pro_idx ON teams(is_pro) WHERE is_pro = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS teams_stripe_customer_idx ON teams(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS teams_stripe_subscription_idx ON teams(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Add RLS policies for billing data
-- Teams can read their own billing status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'teams' AND policyname = 'Teams can read own billing status'
  ) THEN
    CREATE POLICY "Teams can read own billing status"
      ON teams FOR SELECT
      USING (
        id IN (
          SELECT team_id FROM team_members 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Only team owners/admins can update billing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'teams' AND policyname = 'Team admins can update billing'
  ) THEN
    CREATE POLICY "Team admins can update billing"
      ON teams FOR UPDATE
      USING (
        id IN (
          SELECT team_id FROM team_members 
          WHERE user_id = auth.uid() 
          AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;

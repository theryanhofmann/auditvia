-- Add billing fields to teams table (conditional on table existence)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
    -- Add billing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'billing_status') THEN
      ALTER TABLE teams
      ADD COLUMN billing_status TEXT NOT NULL DEFAULT 'trial' CHECK (billing_status IN ('free', 'trial', 'pro')),
      ADD COLUMN stripe_customer_id TEXT UNIQUE,
      ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');
      
      -- Add index for faster lookups
      CREATE INDEX idx_teams_stripe_customer_id ON teams(stripe_customer_id);
    END IF;
  END IF;
END $$;

-- Create function to check if team is on trial
CREATE OR REPLACE FUNCTION is_team_on_trial(team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_id
      AND billing_status = 'trial'
      AND trial_ends_at > NOW()
  );
END;
$$;

-- Create function to check if team has pro access
CREATE OR REPLACE FUNCTION has_team_pro_access(team_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_id
      AND (
        billing_status = 'pro'
        OR (billing_status = 'trial' AND trial_ends_at > NOW())
      )
  );
END;
$$;

-- Update RLS policies to check pro access (conditional on team_id column existing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sites' AND column_name = 'team_id') THEN
    CREATE POLICY "Allow pro features for pro/trial teams" ON sites
      FOR ALL 
      USING (
        has_team_pro_access(team_id)
      )
      WITH CHECK (
        has_team_pro_access(team_id)
      );
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_team_on_trial TO authenticated;
GRANT EXECUTE ON FUNCTION has_team_pro_access TO authenticated; 
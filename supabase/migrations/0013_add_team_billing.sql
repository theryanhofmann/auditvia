-- Add billing fields to teams table
ALTER TABLE teams
ADD COLUMN billing_status TEXT NOT NULL DEFAULT 'trial' CHECK (billing_status IN ('free', 'trial', 'pro')),
ADD COLUMN stripe_customer_id TEXT UNIQUE,
ADD COLUMN trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');

-- Add index for faster lookups
CREATE INDEX idx_teams_stripe_customer_id ON teams(stripe_customer_id);

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

-- Update RLS policies to check pro access
CREATE POLICY "Allow pro features for pro/trial teams" ON sites
  FOR ALL 
  USING (
    has_team_pro_access(team_id)
  )
  WITH CHECK (
    has_team_pro_access(team_id)
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_team_on_trial TO authenticated;
GRANT EXECUTE ON FUNCTION has_team_pro_access TO authenticated; 
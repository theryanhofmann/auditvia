-- Fix team_invites schema mismatch between migrations 0015 and 0061
-- Migration 0015 created team_invites without invited_by_user_id
-- Migration 0061 tried to recreate it with invited_by_user_id but used IF NOT EXISTS
-- This migration adds the missing column

-- Add invited_by_user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_invites' 
    AND column_name = 'invited_by_user_id'
  ) THEN
    ALTER TABLE team_invites 
    ADD COLUMN invited_by_user_id UUID REFERENCES users(id);
    
    RAISE NOTICE 'Added invited_by_user_id column to team_invites';
  ELSE
    RAISE NOTICE 'invited_by_user_id column already exists';
  END IF;
END $$;

-- Add message column if it doesn't exist (also from migration 0061)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_invites' 
    AND column_name = 'message'
  ) THEN
    ALTER TABLE team_invites 
    ADD COLUMN message TEXT;
    
    RAISE NOTICE 'Added message column to team_invites';
  ELSE
    RAISE NOTICE 'message column already exists';
  END IF;
END $$;

-- Update role enum to include 'viewer' if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'team_role'::regtype 
    AND enumlabel = 'viewer'
  ) THEN
    ALTER TYPE team_role ADD VALUE 'viewer';
    RAISE NOTICE 'Added viewer to team_role enum';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'viewer already exists in team_role enum';
END $$;

-- Ensure status column has correct check constraint
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS team_invites_status_check;
ALTER TABLE team_invites 
ADD CONSTRAINT team_invites_status_check 
CHECK (status IN ('pending', 'accepted', 'revoked'));

-- Add updated_at column and trigger if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'team_invites' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE team_invites 
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    
    RAISE NOTICE 'Added updated_at column to team_invites';
  END IF;
END $$;

-- Create or replace the updated_at trigger
CREATE OR REPLACE FUNCTION update_team_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS team_invites_updated_at ON team_invites;
CREATE TRIGGER team_invites_updated_at
  BEFORE UPDATE ON team_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_team_invites_updated_at();

-- Drop the old token column if it exists (from migration 0015)
-- Migration 0061 doesn't use tokens
ALTER TABLE team_invites DROP COLUMN IF EXISTS token;
ALTER TABLE team_invites DROP COLUMN IF EXISTS invited_by CASCADE;
ALTER TABLE team_invites DROP COLUMN IF EXISTS expires_at;

-- Recreate RLS policies to match migration 0061 (these override migration 0015)
DROP POLICY IF EXISTS "Team members can view invites" ON team_invites;
DROP POLICY IF EXISTS "Team owners/admins can create invites" ON team_invites;
DROP POLICY IF EXISTS "Team owners/admins can update invite status" ON team_invites;
DROP POLICY IF EXISTS "Owners and admins can create invites" ON team_invites;
DROP POLICY IF EXISTS "Owners and admins can update invites" ON team_invites;
DROP POLICY IF EXISTS "Owners and admins can delete invites" ON team_invites;
DROP POLICY IF EXISTS "Team members can view team invites" ON team_invites;

-- Recreate policies from migration 0061
CREATE POLICY "Team members can view team invites"
  ON team_invites
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can create invites"
  ON team_invites
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update invites"
  ON team_invites
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can delete invites"
  ON team_invites
  FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Create missing indexes
CREATE INDEX IF NOT EXISTS team_invites_team_id_idx ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS team_invites_email_idx ON team_invites(email);
CREATE INDEX IF NOT EXISTS team_invites_status_idx ON team_invites(status);

COMMENT ON TABLE team_invites IS 'Stores pending team member invitations (schema fixed by migration 0071)';
COMMENT ON COLUMN team_invites.invited_by_user_id IS 'User who created the invitation';
COMMENT ON COLUMN team_invites.message IS 'Optional message included with the invitation';


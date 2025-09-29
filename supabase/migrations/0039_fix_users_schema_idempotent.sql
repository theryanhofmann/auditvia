-- Fix users table schema to match code expectations and make operations idempotent
-- This migration adds missing columns and fixes FK constraints

-- Add missing columns to users table (if they don't exist)
DO $$ 
BEGIN
  -- Add email column with unique constraint
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
    ALTER TABLE users ADD COLUMN email TEXT;
    CREATE UNIQUE INDEX users_email_unique ON users(email) WHERE email IS NOT NULL;
  END IF;

  -- Add name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') THEN
    ALTER TABLE users ADD COLUMN name TEXT;
  END IF;

  -- Add avatar_url column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  END IF;

  -- Add last_login_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
    ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;

  -- Add referral_code column if it doesn't exist (should exist from previous migrations)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code') THEN
    ALTER TABLE users ADD COLUMN referral_code UUID DEFAULT gen_random_uuid();
    CREATE UNIQUE INDEX users_referral_code_unique ON users(referral_code);
  END IF;

  -- Add referral_credits column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_credits') THEN
    ALTER TABLE users ADD COLUMN referral_credits INTEGER DEFAULT 0;
  END IF;

  -- Add referred_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by') THEN
    ALTER TABLE users ADD COLUMN referred_by UUID;
  END IF;
END $$;

-- Fix FK constraints: teams and team_members should reference public.users, not auth.users
-- First, check if teams table exists and has wrong FK
DO $$
BEGIN
  -- Fix teams table FK constraint
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    -- Drop old constraint if it exists
    ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_created_by_fkey;
    
    -- Add correct constraint referencing public.users
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'teams' AND constraint_name = 'teams_created_by_public_users_fkey'
    ) THEN
      ALTER TABLE teams 
      ADD CONSTRAINT teams_created_by_public_users_fkey 
      FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Fix team_members table FK constraint
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    -- Drop old constraint if it exists
    ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
    
    -- Add correct constraint referencing public.users
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'team_members' AND constraint_name = 'team_members_user_id_public_users_fkey'
    ) THEN
      ALTER TABLE team_members 
      ADD CONSTRAINT team_members_user_id_public_users_fkey 
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Ensure unique constraint on (team_id, user_id) for idempotent upserts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    -- Create unique constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'team_members' AND constraint_name = 'team_members_team_user_unique'
    ) THEN
      ALTER TABLE team_members 
      ADD CONSTRAINT team_members_team_user_unique 
      UNIQUE (team_id, user_id);
    END IF;
  END IF;
END $$;

-- Update or recreate the team creation trigger to use correct users table
CREATE OR REPLACE FUNCTION handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into team_members with the correct user_id from public.users
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (team_id, user_id) DO NOTHING; -- Idempotent
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_team_created ON teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_team();

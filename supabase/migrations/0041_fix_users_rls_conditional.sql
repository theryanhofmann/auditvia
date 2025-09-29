-- Fix RLS policies to be conditional on table existence
-- This replaces the problematic policy from 0012_update_users_rls.sql

-- Drop the problematic policy if it exists
DROP POLICY IF EXISTS "Users can read team member info" ON public.users;

-- Create the team member info policy only if team_members table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
    -- Allow authenticated users to read basic user info for team members
    CREATE POLICY "Users can read team member info"
      ON public.users
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.user_id = auth.uid()
          AND tm.team_id IN (
            SELECT team_id FROM team_members
            WHERE user_id = users.id
          )
        )
      );
    RAISE NOTICE 'Created conditional team member info policy';
  ELSE
    RAISE NOTICE 'team_members table does not exist, skipping team member info policy';
  END IF;
END $$;

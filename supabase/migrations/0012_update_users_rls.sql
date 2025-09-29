-- Update RLS policies for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can read their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update their own data"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow service role to manage all users
CREATE POLICY "Service role can manage all users"
  ON public.users
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read basic user info for team members
-- This policy is conditional on team_members table existing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
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
  END IF;
END $$;
-- Fix infinite recursion in users table RLS policies
-- The issue is that some policies reference team_members which then references back to users

-- Drop existing problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can read team member info" ON users;

-- Create a simple service role policy for server operations
CREATE POLICY "Service role can manage all users"
  ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow users to read their own data (simple, no recursion)
CREATE POLICY "Users can read their own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = github_id);

-- Allow users to update their own data (simple, no recursion)  
CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = github_id)
  WITH CHECK (auth.uid()::text = github_id);

-- For team member info, we'll handle this in the application layer
-- instead of through complex RLS policies that cause recursion

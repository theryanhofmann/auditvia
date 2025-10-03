-- Fix team_members UPDATE policy recursion issue
-- The subquery on team_members while checking policy on team_members may cause issues
-- Use the SECURITY DEFINER function instead to bypass RLS during the check

DROP POLICY IF EXISTS "Team owners/admins can update member roles" ON team_members;

-- Use SECURITY DEFINER function which bypasses RLS for the check
CREATE POLICY "Team owners/admins can update member roles"
  ON team_members FOR UPDATE
  USING (
    is_team_admin(team_id, auth.uid())
  )
  WITH CHECK (
    -- Prevent promoting to owner role AND
    -- Ensure user can only update within their own team
    role != 'owner' AND
    is_team_admin(team_id, auth.uid())
  );

COMMENT ON POLICY "Team owners/admins can update member roles" ON team_members IS 
'Allows owners and admins to update member roles. Uses SECURITY DEFINER function to avoid RLS recursion.';


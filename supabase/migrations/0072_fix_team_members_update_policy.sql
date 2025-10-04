-- Fix team_members RLS policy bug that blocks all role updates
-- Migration 0015 had a self-referencing WHERE clause (team_members.id = team_members.id)
-- which is always true and blocks all updates when an owner exists

-- Drop the buggy policy
DROP POLICY IF EXISTS "Team owners/admins can update member roles" ON team_members;

-- Recreate with correct logic:
-- - USING: User making the change must be owner/admin
-- - WITH CHECK: Prevent promoting members to 'owner' role (only one owner per team)
CREATE POLICY "Team owners/admins can update member roles"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    -- Prevent promoting to owner role (should only happen via team creation)
    role != 'owner'
  );

COMMENT ON POLICY "Team owners/admins can update member roles" ON team_members IS 
'Allows owners and admins to update member roles, but prevents promoting members to owner';


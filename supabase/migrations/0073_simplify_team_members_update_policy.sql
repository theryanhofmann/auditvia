-- Simplify team_members UPDATE policy to match working team_invites pattern
-- The current policy works in SQL tests but fails in Jest tests
-- This migration uses the exact same pattern as team_invites which IS working

DROP POLICY IF EXISTS "Team owners/admins can update member roles" ON team_members;

-- Use exact same subquery pattern as team_invites policies (which work correctly)
CREATE POLICY "Team owners/admins can update member roles"
  ON team_members FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    -- Prevent promoting to owner role
    role != 'owner'
  );

COMMENT ON POLICY "Team owners/admins can update member roles" ON team_members IS 
'Allows owners and admins to update member roles, using same pattern as team_invites policies';


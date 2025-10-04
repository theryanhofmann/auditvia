-- Fix team_members UPDATE policy recursion issue
-- The subquery on team_members while checking policy on team_members may cause issues
-- Use the SECURITY DEFINER function instead to bypass RLS during the check

DROP POLICY IF EXISTS "Team owners/admins can update member roles" ON team_members;

-- Helper to check whether the acting user has elevated access for a team
CREATE OR REPLACE FUNCTION team_member_has_management_access(
  _team_id UUID,
  _actor_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_actor UUID := COALESCE(_actor_id, auth.uid());
BEGIN
  IF effective_actor IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM team_members
    WHERE team_id = _team_id
      AND user_id = effective_actor
      AND role IN ('owner', 'admin')
  );
END;
$$;

-- Helper function to ensure updates never demote the last remaining owner
CREATE OR REPLACE FUNCTION enforce_team_owner_safety(
  _member_id UUID,
  _team_id UUID,
  _new_role team_role
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  previous_role team_role;
  remaining_owner_count INTEGER;
BEGIN
  SELECT role
  INTO previous_role
  FROM team_members
  WHERE id = _member_id AND team_id = _team_id;

  -- If the member record is missing, block the update
  IF previous_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Only guard when downgrading an owner to another role
  IF previous_role = 'owner' AND _new_role <> 'owner' THEN
    SELECT COUNT(*)
    INTO remaining_owner_count
    FROM team_members
    WHERE team_id = _team_id
      AND role = 'owner'
      AND id <> _member_id;

    IF remaining_owner_count = 0 THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

-- Updated policy leverages helpers to avoid RLS recursion and owner loss
CREATE POLICY "Team owners/admins can update member roles"
  ON team_members FOR UPDATE
  USING (team_member_has_management_access(team_id, auth.uid()))
  WITH CHECK (enforce_team_owner_safety(id, team_id, role));

COMMENT ON POLICY "Team owners/admins can update member roles" ON team_members IS 
'Allows owners/admins to update member roles while preventing the last owner from being demoted.';

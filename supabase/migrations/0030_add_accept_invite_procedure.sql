CREATE OR REPLACE FUNCTION accept_team_invite(
  p_team_id UUID,
  p_user_id UUID,
  p_token TEXT,
  p_role team_role
) RETURNS void AS $$
BEGIN
  -- Start transaction
  BEGIN
    -- Update invite status
    UPDATE team_invites
    SET status = 'accepted'
    WHERE team_id = p_team_id
    AND token = p_token
    AND status = 'pending';

    -- Add user to team
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (p_team_id, p_user_id, p_role);

    -- Commit transaction
    COMMIT;
  EXCEPTION WHEN OTHERS THEN
    -- Rollback on error
    ROLLBACK;
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
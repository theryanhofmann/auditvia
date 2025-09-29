-- Add unique constraint to team_members table for (team_id, user_id)
-- This ensures membership upserts work correctly

DO $$
BEGIN
  -- Check if the constraint already exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'team_members_team_id_user_id_key'
  ) THEN
    -- Add the unique constraint
    ALTER TABLE team_members
    ADD CONSTRAINT team_members_team_id_user_id_key
    UNIQUE (team_id, user_id);
    
    RAISE NOTICE 'Added unique constraint team_members_team_id_user_id_key';
  ELSE
    RAISE NOTICE 'Unique constraint team_members_team_id_user_id_key already exists';
  END IF;
END $$;

-- Verify the constraint was created
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'team_members'::regclass
AND contype = 'u';

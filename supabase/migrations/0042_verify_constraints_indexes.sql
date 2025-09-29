-- Verify and ensure correct DB constraints and indexes for ID normalization

-- Ensure unique index exists on users.github_id for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS users_github_id_unique 
ON public.users(github_id);

-- Verify FK constraints point to the app user table (should already be done by 0040)
DO $$
BEGIN
  -- Drop and recreate teams.created_by FK if it doesn't point to public.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
    JOIN information_schema.table_constraints tc2 ON rc.unique_constraint_name = tc2.constraint_name
    WHERE tc.table_name = 'teams' 
      AND tc.constraint_name LIKE '%created_by%'
      AND tc2.table_name = 'users'
      AND tc2.table_schema = 'public'
  ) THEN
    ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_created_by_fkey;
    ALTER TABLE teams 
    ADD CONSTRAINT teams_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Fixed teams.created_by FK constraint';
  END IF;

  -- Drop and recreate team_members.user_id FK if it doesn't point to public.users  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
    JOIN information_schema.table_constraints tc2 ON rc.unique_constraint_name = tc2.constraint_name
    WHERE tc.table_name = 'team_members'
      AND tc.constraint_name LIKE '%user_id%'
      AND tc2.table_name = 'users'
      AND tc2.table_schema = 'public'
  ) THEN
    ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
    ALTER TABLE team_members 
    ADD CONSTRAINT team_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Fixed team_members.user_id FK constraint';
  END IF;
END $$;

-- Verification query to show current FK constraints
DO $$
DECLARE
  constraint_info RECORD;
BEGIN
  RAISE NOTICE 'Current FK constraints verification:';
  
  FOR constraint_info IN
    SELECT 
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name IN ('teams', 'team_members')
      AND kcu.column_name IN ('created_by', 'user_id')
    ORDER BY tc.table_name, kcu.column_name
  LOOP
    RAISE NOTICE '  %.% -> %.%', 
      constraint_info.table_name, 
      constraint_info.column_name,
      constraint_info.foreign_table_name,
      constraint_info.foreign_column_name;
  END LOOP;
END $$;

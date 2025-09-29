-- Final fix for foreign key constraints to ensure teams creation works
-- This migration ensures all FK constraints point to public.users, not auth.users

-- Step 1: Verify public.users table exists and has correct structure
DO $$
BEGIN
  -- Ensure public.users table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    RAISE EXCEPTION 'public.users table does not exist. Please run user table creation migration first.';
  END IF;
  
  -- Verify public.users has UUID primary key
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
  ) THEN
    RAISE EXCEPTION 'public.users.id must be UUID type';
  END IF;
END $$;

-- Step 2: Fix teams table FK constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') THEN
    -- Drop existing constraint if it exists (idempotent)
    ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_created_by_fkey;
    
    -- Add correct constraint pointing to public.users
    ALTER TABLE teams 
    ADD CONSTRAINT teams_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed teams.created_by FK constraint to reference public.users(id)';
  ELSE
    RAISE NOTICE 'teams table does not exist, skipping FK fix';
  END IF;
END $$;

-- Step 3: Fix team_members table FK constraint  
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
    -- Drop existing constraint if it exists (idempotent)
    ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
    
    -- Add correct constraint pointing to public.users
    ALTER TABLE team_members 
    ADD CONSTRAINT team_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed team_members.user_id FK constraint to reference public.users(id)';
  ELSE
    RAISE NOTICE 'team_members table does not exist, skipping FK fix';
  END IF;
END $$;

-- Step 4: Verify FK constraints are correct
DO $$
DECLARE
  teams_fk_count INTEGER;
  team_members_fk_count INTEGER;
BEGIN
  -- Check teams FK
  SELECT COUNT(*) INTO teams_fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
  JOIN information_schema.table_constraints tc2 ON rc.unique_constraint_name = tc2.constraint_name
  WHERE tc.table_name = 'teams' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc2.table_name = 'users'
  AND tc2.table_schema = 'public';
  
  -- Check team_members FK  
  SELECT COUNT(*) INTO team_members_fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name  
  JOIN information_schema.table_constraints tc2 ON rc.unique_constraint_name = tc2.constraint_name
  WHERE tc.table_name = 'team_members'
  AND tc.constraint_type = 'FOREIGN KEY' 
  AND tc2.table_name = 'users'
  AND tc2.table_schema = 'public'
  AND tc.constraint_name LIKE '%user_id%';
  
  RAISE NOTICE 'FK constraint verification: teams->users: %, team_members->users: %', teams_fk_count, team_members_fk_count;
  
  IF teams_fk_count = 0 AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
    RAISE WARNING 'teams table exists but has no FK to public.users';
  END IF;
  
  IF team_members_fk_count = 0 AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    RAISE WARNING 'team_members table exists but has no FK to public.users';
  END IF;
END $$;

-- Step 5: Ensure trigger function uses correct FK references (idempotent)
CREATE OR REPLACE FUNCTION handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert team membership with ON CONFLICT for idempotency
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT (team_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_team_created ON teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_team();

-- Step 6: Ensure unique constraint exists for idempotent upserts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'team_members' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%team%user%'
    ) THEN
      ALTER TABLE team_members ADD CONSTRAINT team_members_team_user_unique UNIQUE (team_id, user_id);
      RAISE NOTICE 'Added unique constraint on team_members(team_id, user_id)';
    ELSE
      RAISE NOTICE 'Unique constraint on team_members(team_id, user_id) already exists';
    END IF;
  END IF;
END $$;

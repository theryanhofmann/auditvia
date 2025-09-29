-- Fix scans.user_id foreign key to reference public.users instead of auth.users

DO $$
BEGIN
  -- Drop the existing FK constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'scans' 
    AND constraint_name = 'scans_user_id_fkey'
  ) THEN
    ALTER TABLE scans DROP CONSTRAINT scans_user_id_fkey;
    RAISE NOTICE 'Dropped existing scans.user_id FK constraint';
  END IF;

  -- Add new FK constraint pointing to public.users(id)
  ALTER TABLE scans 
  ADD CONSTRAINT scans_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  
  RAISE NOTICE 'Added scans.user_id FK constraint pointing to public.users(id)';
END $$;

-- Also fix sites.user_id if it's still pointing to auth.users
DO $$
BEGIN
  -- Check if sites.user_id FK points to auth.users
  IF EXISTS (
    SELECT 1 FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
    JOIN information_schema.table_constraints tc2 ON rc.unique_constraint_name = tc2.constraint_name
    WHERE tc.table_name = 'sites' 
      AND tc.constraint_name LIKE '%user_id%'
      AND tc2.table_name = 'users'
      AND tc2.table_schema = 'auth'
  ) THEN
    -- Drop existing FK constraint
    ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_user_id_fkey;
    
    -- Add new FK constraint pointing to public.users(id)
    ALTER TABLE sites 
    ADD CONSTRAINT sites_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Fixed sites.user_id FK constraint to point to public.users(id)';
  ELSE
    RAISE NOTICE 'sites.user_id FK constraint already points to public.users(id)';
  END IF;
END $$;

-- Verification query to show current FK constraints
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== FK Constraint Verification ===';
  
  FOR rec IN 
    SELECT 
      tc.table_name,
      kcu.column_name,
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name IN ('scans', 'sites', 'teams', 'team_members')
      AND kcu.column_name LIKE '%user%'
    ORDER BY tc.table_name, kcu.column_name
  LOOP
    RAISE NOTICE 'Table: % | Column: % | References: %.%.%', 
      rec.table_name, rec.column_name, rec.foreign_table_schema, rec.foreign_table_name, rec.foreign_column_name;
  END LOOP;
END $$;

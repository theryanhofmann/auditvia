-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own referral data" ON users;
DROP POLICY IF EXISTS "Users can update their own referral data" ON users;

-- Clear out invalid referrals (only if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by') THEN
    UPDATE users SET referred_by = NULL WHERE referred_by IS NOT NULL;
  END IF;
END $$;

-- Drop existing foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_referred_by_fkey;

-- Convert referral_code to UUID (only if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code') THEN
    ALTER TABLE users
    ALTER COLUMN referral_code TYPE UUID USING referral_code::uuid;
  END IF;
END $$;

-- Add new foreign key constraint (only if both columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by') THEN
    ALTER TABLE users
    ADD CONSTRAINT users_referred_by_fkey
    FOREIGN KEY (referred_by)
    REFERENCES users(referral_code)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Recreate policies (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by') THEN
    
    CREATE POLICY "Users can read their own referral data"
      ON users
      FOR SELECT
      USING (
        (auth.uid())::uuid = id OR 
        EXISTS (
          SELECT 1 FROM users u2 
          WHERE u2.id = auth.uid()::uuid 
          AND u2.referred_by = users.referral_code
        )
      );

    CREATE POLICY "Users can update their own referral data"
      ON users
      FOR UPDATE
      USING ((auth.uid())::uuid = id);
  END IF;
END $$;
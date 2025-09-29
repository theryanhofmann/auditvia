-- Clear out invalid referrals (only if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by') THEN
    UPDATE users SET referred_by = NULL WHERE referred_by IS NOT NULL;
  END IF;
END $$;

-- Drop existing foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_referred_by_fkey;

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
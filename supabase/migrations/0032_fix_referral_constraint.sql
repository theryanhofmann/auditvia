-- Clear out invalid referrals
UPDATE users SET referred_by = NULL WHERE referred_by IS NOT NULL;

-- Drop existing foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_referred_by_fkey;

-- Add new foreign key constraint
ALTER TABLE users
ADD CONSTRAINT users_referred_by_fkey
FOREIGN KEY (referred_by)
REFERENCES users(referral_code)
ON DELETE SET NULL;
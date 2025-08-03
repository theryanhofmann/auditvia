-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own referral data" ON users;
DROP POLICY IF EXISTS "Users can update their own referral data" ON users;

-- Drop existing foreign key constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_referred_by_fkey;

-- Convert referral_code to UUID
ALTER TABLE users
ALTER COLUMN referral_code TYPE UUID USING referral_code::uuid;

-- Convert referred_by to UUID
ALTER TABLE users
ALTER COLUMN referred_by TYPE UUID USING CASE WHEN referred_by IS NULL THEN NULL ELSE referred_by::uuid END;

-- Add new foreign key constraint
ALTER TABLE users
ADD CONSTRAINT users_referred_by_fkey
FOREIGN KEY (referred_by)
REFERENCES users(referral_code)
ON DELETE SET NULL;

-- Recreate policies
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
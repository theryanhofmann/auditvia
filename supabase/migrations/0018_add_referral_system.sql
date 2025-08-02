-- Create index for faster referral lookups if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'users_referral_code_idx'
  ) THEN
    CREATE INDEX users_referral_code_idx ON users(referral_code);
  END IF;
END $$;

-- RLS policies for referral data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own referral data" ON users;
DROP POLICY IF EXISTS "Users can update their own referral data" ON users;

-- Users can read their own referral data and the referral_code of others
CREATE POLICY "Users can read their own referral data"
  ON users
  FOR SELECT
  USING (
    auth.uid() = id OR 
    id IN (
      SELECT id FROM users WHERE referral_code = referred_by
    )
  );

-- Users can only update their own referral data
CREATE POLICY "Users can update their own referral data"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_user_referred ON users;
DROP FUNCTION IF EXISTS increment_referral_credits();

-- Function to increment referral credits
CREATE OR REPLACE FUNCTION increment_referral_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if under the cap and referral exists
  IF NEW.referred_by IS NOT NULL AND 
     (SELECT referral_credits FROM users WHERE referral_code = NEW.referred_by) < 10 THEN
    UPDATE users 
    SET referral_credits = referral_credits + 1 
    WHERE referral_code = NEW.referred_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle referral credit increments
CREATE TRIGGER on_user_referred
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION increment_referral_credits();
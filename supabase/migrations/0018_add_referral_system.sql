-- Add referral system columns to users table
ALTER TABLE users 
  ADD COLUMN referral_code text UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN referred_by text REFERENCES users(referral_code),
  ADD COLUMN referral_credits integer NOT NULL DEFAULT 0;

-- Create index for faster referral lookups
CREATE INDEX users_referral_code_idx ON users(referral_code);

-- RLS policies for referral data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral data and the referral_code of others
CREATE POLICY "Users can read their own referral data"
  ON users
  FOR SELECT
  USING (
    auth.uid() = id OR 
    auth.uid() IN (
      SELECT id FROM users WHERE referral_code = referred_by
    )
  );

-- Users can only update their own referral data
CREATE POLICY "Users can update their own referral data"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

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
-- Drop existing trigger
DROP TRIGGER IF EXISTS on_user_referred ON users;
DROP FUNCTION IF EXISTS increment_referral_credits;

-- Create function to increment referral credits
CREATE OR REPLACE FUNCTION increment_referral_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger
CREATE TRIGGER on_user_referred
  AFTER UPDATE OF referred_by ON users
  FOR EACH ROW
  EXECUTE FUNCTION increment_referral_credits();
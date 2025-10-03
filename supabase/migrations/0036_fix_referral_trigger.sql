-- Drop existing trigger
DROP TRIGGER IF EXISTS on_user_referred ON users;
DROP FUNCTION IF EXISTS increment_referral_credits CASCADE;

-- Create function to increment referral credits
CREATE OR REPLACE FUNCTION increment_referral_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if column exists and proceed
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'referred_by'
  ) THEN
    -- Only increment if under the cap and referral exists
    IF NEW.referred_by IS NOT NULL AND 
       (SELECT referral_credits FROM users WHERE referral_code = NEW.referred_by) < 10 THEN
      UPDATE users 
      SET referral_credits = referral_credits + 1 
      WHERE referral_code = NEW.referred_by;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger only if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'referred_by'
  ) THEN
    CREATE TRIGGER on_user_referred
      AFTER UPDATE OF referred_by ON users
      FOR EACH ROW
      EXECUTE FUNCTION increment_referral_credits();
  END IF;
END $$;
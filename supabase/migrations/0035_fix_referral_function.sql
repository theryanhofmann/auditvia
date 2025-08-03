-- Drop existing function
DROP FUNCTION IF EXISTS update_user_referral;

-- Create function to update user referral
CREATE OR REPLACE FUNCTION update_user_referral(
  p_user_id UUID,
  p_referral_code UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user's referred_by
  UPDATE users
  SET referred_by = p_referral_code
  WHERE id = p_user_id;
END;
$$;
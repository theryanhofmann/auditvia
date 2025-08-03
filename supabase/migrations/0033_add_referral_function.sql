-- Create function to update user referral
CREATE OR REPLACE FUNCTION update_user_referral(
  p_user_id UUID,
  p_referral_code TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user's referred_by
  UPDATE users
  SET referred_by = (
    SELECT id
    FROM users
    WHERE referral_code = p_referral_code::uuid
  )
  WHERE id = p_user_id;
END;
$$;
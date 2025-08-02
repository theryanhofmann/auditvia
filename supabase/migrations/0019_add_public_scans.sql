-- Add public column to scans table
ALTER TABLE scans ADD COLUMN public BOOLEAN NOT NULL DEFAULT false;

-- Add RLS policy for public scans
CREATE POLICY "Anyone can read public scans" ON scans
  FOR SELECT
  USING (public = true);

-- Update existing policy to allow owners to update public status
DROP POLICY IF EXISTS "Users can update their own scans" ON scans;
CREATE POLICY "Users can update their own scans" ON scans
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id); 
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
  USING (
    EXISTS (
      SELECT 1 FROM sites s
      INNER JOIN team_members tm ON tm.team_id = s.team_id
      WHERE s.id = scans.site_id
      AND tm.user_id = auth.uid()::uuid
      AND tm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites s
      INNER JOIN team_members tm ON tm.team_id = s.team_id
      WHERE s.id = scans.site_id
      AND tm.user_id = auth.uid()::uuid
      AND tm.role IN ('owner', 'admin')
    )
  );
-- Update RLS policies to allow joining with sites
CREATE POLICY "Allow users to read their own scan trends"
ON scan_trends
FOR SELECT
USING (
  site_id IN (
    SELECT id FROM sites
    WHERE user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT SELECT ON scan_trends TO authenticated;
GRANT SELECT ON sites TO authenticated; 
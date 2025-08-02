-- Create AI suggestions table
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  suggestions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX idx_ai_suggestions_scan_id ON ai_suggestions(scan_id);

-- Enable RLS
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policy that allows access if user has access to the scan
CREATE POLICY "Users can view suggestions for scans they can access" ON ai_suggestions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM scans s
      JOIN sites ON sites.id = s.site_id
      WHERE s.id = ai_suggestions.scan_id
      AND sites.team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Function to check if scan belongs to pro team
CREATE OR REPLACE FUNCTION can_access_ai_suggestions(scan_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM scans s
    JOIN sites ON sites.id = s.site_id
    WHERE s.id = scan_id
    AND has_team_pro_access(sites.team_id)
  );
END;
$$;

-- Function to get suggestions for a scan
CREATE OR REPLACE FUNCTION get_scan_suggestions(scan_id UUID)
RETURNS TABLE (
  id UUID,
  scan_id UUID,
  suggestions JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has access and team is pro
  IF NOT can_access_ai_suggestions(scan_id) THEN
    RAISE EXCEPTION 'Access denied or pro subscription required';
  END IF;

  RETURN QUERY
  SELECT s.id, s.scan_id, s.suggestions, s.created_at
  FROM ai_suggestions s
  WHERE s.scan_id = scan_id
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_access_ai_suggestions TO authenticated;
GRANT EXECUTE ON FUNCTION get_scan_suggestions TO authenticated; 
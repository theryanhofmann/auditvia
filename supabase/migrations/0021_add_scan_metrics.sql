-- Drop dependent views first
DROP VIEW IF EXISTS scan_summaries;
DROP VIEW IF EXISTS site_trend_stats;

-- Add new scan metrics columns
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS total_violations INTEGER,
  ADD COLUMN IF NOT EXISTS passes INTEGER,
  ADD COLUMN IF NOT EXISTS incomplete INTEGER,
  ADD COLUMN IF NOT EXISTS inapplicable INTEGER,
  ADD COLUMN IF NOT EXISTS scan_time_ms INTEGER;

-- Drop score-related columns
ALTER TABLE scans
  DROP COLUMN IF EXISTS score;

ALTER TABLE scan_trends
  DROP COLUMN IF EXISTS score_change;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_scan_record(UUID, TEXT, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER);

-- Create function to update scan record
CREATE OR REPLACE FUNCTION update_scan_record(
  p_scan_id UUID,
  p_status TEXT,
  p_finished_at TIMESTAMPTZ,
  p_total_violations INTEGER,
  p_passes INTEGER,
  p_incomplete INTEGER,
  p_inapplicable INTEGER,
  p_scan_time_ms INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE scans
  SET 
    status = p_status,
    finished_at = p_finished_at,
    total_violations = p_total_violations,
    passes = p_passes,
    incomplete = p_incomplete,
    inapplicable = p_inapplicable,
    scan_time_ms = p_scan_time_ms
  WHERE id = p_scan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_scan_record(UUID, TEXT, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;

-- Recreate the scan_summaries view without score
CREATE OR REPLACE VIEW scan_summaries AS
SELECT 
  s.site_id,
  s.id as scan_id,
  s.created_at,
  s.total_violations,
  s.passes,
  s.incomplete,
  s.inapplicable,
  s.scan_time_ms
FROM scans s
WHERE s.status = 'completed'
ORDER BY s.created_at DESC;

-- Recreate the site_trend_stats view without score
CREATE OR REPLACE VIEW site_trend_stats AS
SELECT 
  st.site_id,
  st.created_at,
  st.new_issues_count as violations_added,
  st.resolved_issues_count as violations_resolved,
  (st.critical_issues_delta + st.serious_issues_delta + st.moderate_issues_delta + st.minor_issues_delta) as total_violations_delta
FROM scan_trends st
ORDER BY st.created_at DESC;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own scans" ON scans;
DROP POLICY IF EXISTS "Users can create scans for their sites" ON scans;
DROP POLICY IF EXISTS "Users can update their own scans" ON scans;

-- Create RLS policies with team-based access
CREATE POLICY "Team members can view scans" ON scans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites s
      INNER JOIN team_members tm ON tm.team_id = s.team_id
      WHERE s.id = scans.site_id
      AND tm.user_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Team members can create scans" ON scans
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites s
      INNER JOIN team_members tm ON tm.team_id = s.team_id
      WHERE s.id = site_id
      AND tm.user_id = auth.uid()::uuid
    )
  );

CREATE POLICY "Team admins can update scans" ON scans
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
      WHERE s.id = site_id
      AND tm.user_id = auth.uid()::uuid
      AND tm.role IN ('owner', 'admin')
    )
  );
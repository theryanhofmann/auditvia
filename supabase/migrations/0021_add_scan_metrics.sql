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
GRANT EXECUTE ON FUNCTION update_scan_record TO authenticated;

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

-- Create RLS policies
CREATE POLICY "Users can view their own scans" ON scans
  FOR SELECT
  USING (
    site_id IN (
      SELECT id FROM sites WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scans for their sites" ON scans
  FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT id FROM sites WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own scans" ON scans
  FOR UPDATE
  USING (
    site_id IN (
      SELECT id FROM sites WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    site_id IN (
      SELECT id FROM sites WHERE user_id = auth.uid()
    )
  ); 
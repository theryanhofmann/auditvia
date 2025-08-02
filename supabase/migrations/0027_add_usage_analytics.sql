-- Create usage_stats table for daily aggregation
CREATE TABLE usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_scans INTEGER DEFAULT 0,
  total_issues INTEGER DEFAULT 0,
  resolved_issues INTEGER DEFAULT 0,
  avg_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint to prevent duplicate dates per team
CREATE UNIQUE INDEX idx_usage_stats_team_date ON usage_stats(team_id, date);

-- Enable RLS
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view their team's stats
CREATE POLICY "Users can view their team's usage stats" ON usage_stats
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Function to calculate usage stats for a team and date
CREATE OR REPLACE FUNCTION calculate_team_usage_stats(
  team_id UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  total_scans INTEGER,
  total_issues INTEGER,
  resolved_issues INTEGER,
  avg_score NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prev_date DATE := target_date - INTERVAL '1 day';
  prev_issues JSONB;
  curr_issues JSONB;
BEGIN
  -- Get issues from previous day's last scan for each site
  WITH prev_scans AS (
    SELECT DISTINCT ON (site_id) s.id, s.site_id
    FROM scans s
    JOIN sites ON sites.id = s.site_id
    WHERE sites.team_id = team_id
    AND DATE(s.created_at) = prev_date
    ORDER BY site_id, s.created_at DESC
  )
  SELECT jsonb_object_agg(i.rule, i.id)
  INTO prev_issues
  FROM prev_scans ps
  JOIN issues i ON i.scan_id = ps.id;

  -- Get issues from current day's last scan for each site
  WITH curr_scans AS (
    SELECT DISTINCT ON (site_id) s.id, s.site_id
    FROM scans s
    JOIN sites ON sites.id = s.site_id
    WHERE sites.team_id = team_id
    AND DATE(s.created_at) = target_date
    ORDER BY site_id, s.created_at DESC
  )
  SELECT jsonb_object_agg(i.rule, i.id)
  INTO curr_issues
  FROM curr_scans cs
  JOIN issues i ON i.scan_id = cs.id;

  -- Calculate stats
  RETURN QUERY
  SELECT
    COUNT(s.id)::INTEGER as total_scans,
    SUM(COALESCE(s.total_issues, 0))::INTEGER as total_issues,
    (
      CASE
        WHEN prev_issues IS NULL THEN 0
        ELSE (
          SELECT COUNT(*)::INTEGER
          FROM jsonb_object_keys(prev_issues) pk
          WHERE NOT curr_issues ? pk
        )
      END
    ) as resolved_issues,
    ROUND(AVG(s.score)::NUMERIC, 2) as avg_score
  FROM scans s
  JOIN sites ON sites.id = s.site_id
  WHERE sites.team_id = team_id
  AND DATE(s.created_at) = target_date;
END;
$$;

-- Function to update usage stats for a team
CREATE OR REPLACE FUNCTION update_team_usage_stats(
  team_id UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Calculate stats
  WITH stats AS (
    SELECT * FROM calculate_team_usage_stats(team_id, target_date)
  )
  INSERT INTO usage_stats (
    team_id,
    date,
    total_scans,
    total_issues,
    resolved_issues,
    avg_score
  )
  SELECT
    team_id,
    target_date,
    total_scans,
    total_issues,
    resolved_issues,
    avg_score
  FROM stats
  ON CONFLICT (team_id, date)
  DO UPDATE SET
    total_scans = EXCLUDED.total_scans,
    total_issues = EXCLUDED.total_issues,
    resolved_issues = EXCLUDED.resolved_issues,
    avg_score = EXCLUDED.avg_score,
    updated_at = NOW();
END;
$$;

-- Function to get usage stats for a team
CREATE OR REPLACE FUNCTION get_team_usage_stats(
  team_id UUID,
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  total_scans INTEGER,
  total_issues INTEGER,
  resolved_issues INTEGER,
  avg_score NUMERIC(5,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify user has access to team
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    us.date,
    us.total_scans,
    us.total_issues,
    us.resolved_issues,
    us.avg_score
  FROM usage_stats us
  WHERE us.team_id = team_id
  AND us.date BETWEEN start_date AND end_date
  ORDER BY us.date ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_team_usage_stats TO service_role;
GRANT EXECUTE ON FUNCTION update_team_usage_stats TO service_role;
GRANT EXECUTE ON FUNCTION get_team_usage_stats TO authenticated; 
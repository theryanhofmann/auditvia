-- =====================================================
-- AUDITVIA REPORTS DASHBOARD - DATABASE VIEWS
-- =====================================================
-- This migration creates read-only views for the reports dashboard
-- All views support filtering by: team_id, site_id, time_window_start, time_window_end
-- =====================================================

-- First, drop any existing views to allow column changes
DROP VIEW IF EXISTS risk_reduced_view CASCADE;
DROP VIEW IF EXISTS false_positive_view CASCADE;
DROP VIEW IF EXISTS tickets_view CASCADE;
DROP VIEW IF EXISTS coverage_view CASCADE;
DROP VIEW IF EXISTS backlog_age_view CASCADE;
DROP VIEW IF EXISTS top_pages_view CASCADE;
DROP VIEW IF EXISTS top_rules_view CASCADE;
DROP VIEW IF EXISTS fix_throughput_view CASCADE;
DROP VIEW IF EXISTS violations_trend_view CASCADE;
DROP VIEW IF EXISTS report_kpis_view CASCADE;

-- =====================================================
-- VIEW 1: KPI Summary
-- Returns: total violations, avg score, sites monitored, total scans
-- =====================================================
CREATE OR REPLACE VIEW report_kpis_view AS
SELECT
  s.team_id,
  COUNT(DISTINCT sc.id) FILTER (WHERE sc.created_at >= NOW() - INTERVAL '30 days') as total_scans_30d,
  COUNT(DISTINCT s.id) as total_sites,
  COUNT(DISTINCT s.id) FILTER (WHERE s.monitoring_enabled = true) as monitored_sites,
  COALESCE(SUM(sc.total_violations) FILTER (WHERE sc.created_at >= NOW() - INTERVAL '30 days'), 0) as total_violations_30d,
  COALESCE(AVG(
    CASE 
      WHEN (sc.passes + sc.total_violations + sc.incomplete + sc.inapplicable) > 0
      THEN ((sc.passes + sc.inapplicable)::DECIMAL / (sc.passes + sc.total_violations + sc.incomplete + sc.inapplicable)::DECIMAL) * 100
      ELSE 0
    END
  ) FILTER (WHERE sc.created_at >= NOW() - INTERVAL '30 days'), 0) as avg_score_30d,
  COUNT(DISTINCT i.id) FILTER (
    WHERE i.github_issue_url IS NOT NULL 
    AND sc.created_at >= NOW() - INTERVAL '30 days'
  ) as github_issues_created_30d
FROM sites s
LEFT JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
LEFT JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
GROUP BY s.team_id;

COMMENT ON VIEW report_kpis_view IS 'High-level KPIs for dashboard summary cards';

-- =====================================================
-- VIEW 2: Violations Trend
-- Returns: daily violation counts over time
-- =====================================================
CREATE OR REPLACE VIEW violations_trend_view AS
SELECT
  s.team_id,
  s.id as site_id,
  DATE(sc.created_at) as date,
  COUNT(DISTINCT sc.id) as scan_count,
  COALESCE(SUM(sc.total_violations), 0) as total_violations,
  COALESCE(SUM(CASE WHEN i.impact = 'critical' THEN 1 ELSE 0 END), 0) as critical_count,
  COALESCE(SUM(CASE WHEN i.impact = 'serious' THEN 1 ELSE 0 END), 0) as serious_count,
  COALESCE(SUM(CASE WHEN i.impact = 'moderate' THEN 1 ELSE 0 END), 0) as moderate_count,
  COALESCE(SUM(CASE WHEN i.impact = 'minor' THEN 1 ELSE 0 END), 0) as minor_count
FROM sites s
LEFT JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
LEFT JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
  AND sc.created_at >= NOW() - INTERVAL '90 days'
GROUP BY s.team_id, s.id, DATE(sc.created_at)
ORDER BY date DESC;

COMMENT ON VIEW violations_trend_view IS 'Daily violation counts grouped by severity for trend charts';

-- =====================================================
-- VIEW 3: Fix Throughput
-- Returns: violations fixed vs. created over time
-- Note: A violation is "fixed" if it appeared in scan N but not in scan N+1
-- =====================================================
CREATE OR REPLACE VIEW fix_throughput_view AS
WITH scan_pairs AS (
  SELECT
    s.team_id,
    s.id as site_id,
    s.name as site_name,
    sc1.id as current_scan_id,
    sc1.created_at as current_date,
    sc2.id as previous_scan_id,
    sc2.created_at as previous_date,
    ROW_NUMBER() OVER (PARTITION BY s.id, sc1.id ORDER BY sc2.created_at DESC) as rn
  FROM sites s
  INNER JOIN scans sc1 ON s.id = sc1.site_id AND sc1.status = 'completed'
  LEFT JOIN scans sc2 ON s.id = sc2.site_id 
    AND sc2.status = 'completed'
    AND sc2.created_at < sc1.created_at
  WHERE s.team_id IS NOT NULL
    AND sc1.created_at >= NOW() - INTERVAL '90 days'
),
filtered_pairs AS (
  SELECT * FROM scan_pairs WHERE rn = 1 OR previous_scan_id IS NULL
),
current_violations AS (
  SELECT 
    fp.team_id,
    fp.site_id,
    fp.site_name,
    fp.current_date,
    i.rule,
    i.impact,
    COUNT(*) as violation_count
  FROM filtered_pairs fp
  INNER JOIN issues i ON fp.current_scan_id = i.scan_id
  GROUP BY fp.team_id, fp.site_id, fp.site_name, fp.current_date, i.rule, i.impact
),
previous_violations AS (
  SELECT 
    fp.team_id,
    fp.site_id,
    i.rule,
    i.impact,
    COUNT(*) as violation_count
  FROM filtered_pairs fp
  INNER JOIN issues i ON fp.previous_scan_id = i.scan_id
  WHERE fp.previous_scan_id IS NOT NULL
  GROUP BY fp.team_id, fp.site_id, i.rule, i.impact
)
SELECT
  cv.team_id,
  cv.site_id,
  cv.site_name,
  DATE(cv.current_date) as date,
  SUM(cv.violation_count) as violations_created,
  COALESCE(SUM(pv.violation_count), 0) as violations_previous,
  SUM(cv.violation_count) - COALESCE(SUM(pv.violation_count), 0) as net_change,
  CASE 
    WHEN SUM(pv.violation_count) > SUM(cv.violation_count) 
    THEN SUM(pv.violation_count) - SUM(cv.violation_count)
    ELSE 0
  END as violations_fixed
FROM current_violations cv
LEFT JOIN previous_violations pv 
  ON cv.team_id = pv.team_id 
  AND cv.site_id = pv.site_id 
  AND cv.rule = pv.rule
  AND cv.impact = pv.impact
GROUP BY cv.team_id, cv.site_id, cv.site_name, DATE(cv.current_date)
ORDER BY date DESC;

COMMENT ON VIEW fix_throughput_view IS 'Tracks violations fixed vs. created by comparing consecutive scans';

-- =====================================================
-- VIEW 4: Top Rules (Most Common Violations)
-- Returns: violation rules ranked by frequency
-- =====================================================
CREATE OR REPLACE VIEW top_rules_view AS
SELECT
  s.team_id,
  i.rule,
  i.impact,
  COUNT(*) as violation_count,
  COUNT(DISTINCT sc.site_id) as affected_sites,
  COUNT(DISTINCT i.id) FILTER (WHERE i.github_issue_url IS NOT NULL) as github_issues_created,
  MIN(i.description) as description,
  MIN(i.help_url) as help_url,
  ARRAY_AGG(DISTINCT sc.site_id) as site_ids
FROM sites s
INNER JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
INNER JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
  AND sc.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.team_id, i.rule, i.impact
ORDER BY violation_count DESC;

COMMENT ON VIEW top_rules_view IS 'Most frequent violation rules across all sites';

-- =====================================================
-- VIEW 5: Top Pages (Most Violations per Site)
-- Returns: sites with most violations
-- =====================================================
CREATE OR REPLACE VIEW top_pages_view AS
WITH latest_scans AS (
  SELECT DISTINCT ON (s.id)
    s.team_id,
    s.id as site_id,
    s.name as site_name,
    s.url,
    sc.created_at as last_scan_date,
    sc.id as latest_scan_id
  FROM sites s
  INNER JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
  WHERE s.team_id IS NOT NULL
  ORDER BY s.id, sc.created_at DESC
)
SELECT
  ls.team_id,
  ls.site_id,
  ls.site_name,
  ls.url,
  ls.last_scan_date,
  COUNT(i.id) as total_violations,
  COUNT(i.id) FILTER (WHERE i.impact = 'critical') as critical_count,
  COUNT(i.id) FILTER (WHERE i.impact = 'serious') as serious_count,
  COUNT(i.id) FILTER (WHERE i.impact = 'moderate') as moderate_count,
  COUNT(i.id) FILTER (WHERE i.impact = 'minor') as minor_count,
  CASE 
    WHEN (sc.passes + sc.total_violations + sc.incomplete + sc.inapplicable) > 0
    THEN ROUND(((sc.passes + sc.inapplicable)::DECIMAL / (sc.passes + sc.total_violations + sc.incomplete + sc.inapplicable)::DECIMAL) * 100, 2)
    ELSE 0
  END as score
FROM latest_scans ls
INNER JOIN scans sc ON ls.latest_scan_id = sc.id
LEFT JOIN issues i ON sc.id = i.scan_id
GROUP BY ls.team_id, ls.site_id, ls.site_name, ls.url, ls.last_scan_date, sc.passes, sc.total_violations, sc.incomplete, sc.inapplicable
ORDER BY total_violations DESC;

COMMENT ON VIEW top_pages_view IS 'Sites ranked by violation count (from latest scan)';

-- =====================================================
-- VIEW 6: Backlog Age
-- Returns: how long violations have been open
-- Note: Simplified - uses first scan date as proxy for "age"
-- =====================================================
CREATE OR REPLACE VIEW backlog_age_view AS
WITH first_scans AS (
  SELECT
    site_id,
    MIN(created_at) as first_scan_date
  FROM scans
  WHERE status = 'completed'
  GROUP BY site_id
),
latest_scans AS (
  SELECT DISTINCT ON (site_id)
    site_id,
    created_at as last_scan_date,
    id as latest_scan_id
  FROM scans
  WHERE status = 'completed'
  ORDER BY site_id, created_at DESC
)
SELECT
  s.team_id,
  s.id as site_id,
  s.name as site_name,
  i.rule,
  i.impact,
  i.description,
  fs.first_scan_date,
  ls.last_scan_date,
  EXTRACT(DAY FROM ls.last_scan_date - fs.first_scan_date) as days_old,
  COUNT(i.id) as occurrence_count,
  MIN(i.github_issue_url) as github_issue_url
FROM sites s
INNER JOIN first_scans fs ON s.id = fs.site_id
INNER JOIN latest_scans ls ON s.id = ls.site_id
INNER JOIN issues i ON ls.latest_scan_id = i.scan_id
WHERE s.team_id IS NOT NULL
GROUP BY s.team_id, s.id, s.name, i.rule, i.impact, i.description, fs.first_scan_date, ls.last_scan_date
ORDER BY days_old DESC;

COMMENT ON VIEW backlog_age_view IS 'Age of open violations (simplified: assumes persistence since first scan)';

-- =====================================================
-- VIEW 7: Coverage
-- Returns: scan coverage by site (last scan date, frequency)
-- =====================================================
CREATE OR REPLACE VIEW coverage_view AS
WITH scan_intervals AS (
  SELECT
    site_id,
    created_at,
    LAG(created_at) OVER (PARTITION BY site_id ORDER BY created_at) as prev_scan_date
  FROM scans
  WHERE status = 'completed'
),
scan_stats AS (
  SELECT
    site_id,
    COUNT(*) as total_scans,
    MAX(created_at) as last_scan_date,
    MIN(created_at) as first_scan_date,
    AVG(EXTRACT(EPOCH FROM (created_at - prev_scan_date))) as avg_scan_interval_seconds
  FROM scan_intervals
  WHERE prev_scan_date IS NOT NULL
  GROUP BY site_id
)
SELECT
  s.team_id,
  s.id as site_id,
  s.name as site_name,
  s.url,
  s.monitoring_enabled,
  ss.total_scans,
  ss.last_scan_date,
  ss.first_scan_date,
  ROUND(ss.avg_scan_interval_seconds / 86400.0, 1) as avg_days_between_scans,
  CASE
    WHEN ss.last_scan_date >= NOW() - INTERVAL '7 days' THEN 'recent'
    WHEN ss.last_scan_date >= NOW() - INTERVAL '30 days' THEN 'stale'
    ELSE 'very_stale'
  END as coverage_status,
  EXTRACT(DAY FROM NOW() - ss.last_scan_date) as days_since_last_scan
FROM sites s
LEFT JOIN scan_stats ss ON s.id = ss.site_id
WHERE s.team_id IS NOT NULL
ORDER BY ss.last_scan_date DESC NULLS LAST;

COMMENT ON VIEW coverage_view IS 'Scan coverage and frequency by site';

-- =====================================================
-- VIEW 8: Tickets (GitHub/Jira Integration)
-- Returns: ticket creation stats
-- =====================================================
CREATE OR REPLACE VIEW tickets_view AS
SELECT
  s.team_id,
  s.id as site_id,
  s.name as site_name,
  COUNT(DISTINCT i.id) FILTER (WHERE i.github_issue_url IS NOT NULL) as total_issues_created,
  COUNT(DISTINCT i.id) FILTER (
    WHERE i.github_issue_url IS NOT NULL 
    AND i.github_issue_created_at >= NOW() - INTERVAL '7 days'
  ) as issues_created_7d,
  COUNT(DISTINCT i.id) FILTER (
    WHERE i.github_issue_url IS NOT NULL 
    AND i.github_issue_created_at >= NOW() - INTERVAL '30 days'
  ) as issues_created_30d,
  MIN(i.github_issue_created_at) as first_issue_date,
  MAX(i.github_issue_created_at) as last_issue_date,
  ARRAY_AGG(DISTINCT i.rule) FILTER (WHERE i.github_issue_url IS NOT NULL) as rules_with_issues
FROM sites s
LEFT JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
LEFT JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
GROUP BY s.team_id, s.id, s.name;

COMMENT ON VIEW tickets_view IS 'GitHub issue creation statistics';

-- =====================================================
-- VIEW 9: False Positives
-- Returns: placeholder for future false-positive tracking
-- Note: Currently returns empty - needs violation status field
-- =====================================================
CREATE OR REPLACE VIEW false_positive_view AS
SELECT
  s.team_id,
  s.id as site_id,
  s.name as site_name,
  i.rule,
  0 as false_positive_count,
  0 as total_occurrences,
  0.0 as false_positive_rate
FROM sites s
LEFT JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
LEFT JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
  AND 1=0 -- Intentionally empty until we add violation status tracking
GROUP BY s.team_id, s.id, s.name, i.rule;

COMMENT ON VIEW false_positive_view IS 'Placeholder for false-positive tracking (requires new violation_status field)';

-- =====================================================
-- VIEW 10: Risk Reduced
-- Returns: estimated accessibility risk reduction
-- Methodology: Assign dollar values by severity, calculate reduction
-- =====================================================
CREATE OR REPLACE VIEW risk_reduced_view AS
WITH severity_weights AS (
  SELECT 'critical' as severity, 10000 as risk_value
  UNION ALL SELECT 'serious', 5000
  UNION ALL SELECT 'moderate', 1000
  UNION ALL SELECT 'minor', 100
),
scan_pairs AS (
  SELECT
    s.team_id,
    s.id as site_id,
    sc1.id as current_scan_id,
    sc1.created_at as current_date,
    sc2.id as previous_scan_id,
    ROW_NUMBER() OVER (PARTITION BY s.id, sc1.id ORDER BY sc2.created_at DESC) as rn
  FROM sites s
  INNER JOIN scans sc1 ON s.id = sc1.site_id AND sc1.status = 'completed'
  LEFT JOIN scans sc2 ON s.id = sc2.site_id 
    AND sc2.status = 'completed'
    AND sc2.created_at < sc1.created_at
  WHERE sc1.created_at >= NOW() - INTERVAL '90 days'
),
filtered_pairs AS (
  SELECT * FROM scan_pairs WHERE rn = 1
),
current_risk AS (
  SELECT
    fp.team_id,
    fp.site_id,
    fp.current_date,
    i.impact as severity,
    COUNT(*) * sw.risk_value as risk_amount
  FROM filtered_pairs fp
  INNER JOIN issues i ON fp.current_scan_id = i.scan_id
  INNER JOIN severity_weights sw ON i.impact = sw.severity
  GROUP BY fp.team_id, fp.site_id, fp.current_date, i.impact, sw.risk_value
),
previous_risk AS (
  SELECT
    fp.team_id,
    fp.site_id,
    i.impact as severity,
    COUNT(*) * sw.risk_value as risk_amount
  FROM filtered_pairs fp
  INNER JOIN issues i ON fp.previous_scan_id = i.scan_id
  INNER JOIN severity_weights sw ON i.impact = sw.severity
  WHERE fp.previous_scan_id IS NOT NULL
  GROUP BY fp.team_id, fp.site_id, i.impact, sw.risk_value
)
SELECT
  cr.team_id,
  cr.site_id,
  DATE(cr.current_date) as date,
  cr.severity,
  cr.risk_amount as current_risk,
  COALESCE(pr.risk_amount, 0) as previous_risk,
  COALESCE(pr.risk_amount, 0) - cr.risk_amount as risk_reduced
FROM current_risk cr
LEFT JOIN previous_risk pr 
  ON cr.team_id = pr.team_id 
  AND cr.site_id = pr.site_id 
  AND cr.severity = pr.severity
ORDER BY cr.current_date DESC;

COMMENT ON VIEW risk_reduced_view IS 'Estimated accessibility risk reduction in dollars (Critical=$10k, Serious=$5k, Moderate=$1k, Minor=$100)';

-- =====================================================
-- Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_scans_team_created 
  ON scans(created_at DESC) 
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_issues_scan_impact 
  ON issues(scan_id, impact);

CREATE INDEX IF NOT EXISTS idx_issues_github_created 
  ON issues(github_issue_created_at) 
  WHERE github_issue_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sites_team_monitoring 
  ON sites(team_id, monitoring_enabled);

-- Grant permissions
GRANT SELECT ON report_kpis_view TO authenticated, service_role;
GRANT SELECT ON violations_trend_view TO authenticated, service_role;
GRANT SELECT ON fix_throughput_view TO authenticated, service_role;
GRANT SELECT ON top_rules_view TO authenticated, service_role;
GRANT SELECT ON top_pages_view TO authenticated, service_role;
GRANT SELECT ON backlog_age_view TO authenticated, service_role;
GRANT SELECT ON coverage_view TO authenticated, service_role;
GRANT SELECT ON tickets_view TO authenticated, service_role;
GRANT SELECT ON false_positive_view TO authenticated, service_role;
GRANT SELECT ON risk_reduced_view TO authenticated, service_role;

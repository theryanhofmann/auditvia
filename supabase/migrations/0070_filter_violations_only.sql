-- Update all report views to filter violations only (exclude advisories)
-- This ensures compliance scores, risk calculations, and KPIs only consider WCAG mandatory issues
--
-- NOTE: This migration is temporarily disabled because it depends on columns that don't exist yet.
-- These views will be created in a later migration after all schema changes are complete.
--
-- =====================================================
-- Drop existing views first to allow column changes
-- =====================================================
DROP VIEW IF EXISTS risk_reduced_view CASCADE;
DROP VIEW IF EXISTS tickets_view CASCADE;
DROP VIEW IF EXISTS fix_throughput_view CASCADE;
DROP VIEW IF EXISTS backlog_age_view CASCADE;
DROP VIEW IF EXISTS top_pages_view CASCADE;
DROP VIEW IF EXISTS top_rules_view CASCADE;
DROP VIEW IF EXISTS violations_trend_view CASCADE;
DROP VIEW IF EXISTS report_kpis_view CASCADE;

-- Views will be recreated in a later migration after all required columns exist (0070+)

/*
-- =====================================================
-- VIEW 1: KPI Summary (updated to exclude advisories)
-- =====================================================
CREATE VIEW report_kpis_view AS
SELECT
  s.team_id,
  COUNT(DISTINCT sc.id) FILTER (WHERE sc.created_at >= NOW() - INTERVAL '30 days') as total_scans_30d,
  COUNT(DISTINCT s.id) as total_sites,
  COUNT(DISTINCT s.id) FILTER (WHERE s.monitoring_enabled = true) as monitored_sites,
  -- Count only violations (tier != 'advisory'), fallback to all issues if tier is NULL (legacy)
  COALESCE(COUNT(DISTINCT i.id) FILTER (
    WHERE sc.created_at >= NOW() - INTERVAL '30 days'
    AND (i.tier IS NULL OR i.tier != 'advisory')
  ), 0) as total_violations_30d,
  -- Simplified score calculation that doesn't rely on columns that may not exist yet
  COALESCE(AVG(sc.score) FILTER (WHERE sc.created_at >= NOW() - INTERVAL '30 days'), 0) as avg_score_30d,
  0 as github_issues_created_30d  -- Placeholder until github_issue_url column exists
FROM sites s
LEFT JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
LEFT JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
GROUP BY s.team_id;

COMMENT ON VIEW report_kpis_view IS 'High-level KPIs for dashboard - violations only (excludes advisories)';

-- =====================================================
-- VIEW 2: Violations Trend (updated to exclude advisories)
-- =====================================================
CREATE VIEW violations_trend_view AS
SELECT
  s.team_id,
  s.id as site_id,
  DATE(sc.created_at) as date,
  COUNT(DISTINCT sc.id) as scan_count,
  -- Count only violations
  COALESCE(COUNT(i.id) FILTER (WHERE i.tier IS NULL OR i.tier != 'advisory'), 0) as total_violations,
  COALESCE(COUNT(i.id) FILTER (WHERE i.impact = 'critical' AND (i.tier IS NULL OR i.tier != 'advisory')), 0) as critical_count,
  COALESCE(COUNT(i.id) FILTER (WHERE i.impact = 'serious' AND (i.tier IS NULL OR i.tier != 'advisory')), 0) as serious_count,
  COALESCE(COUNT(i.id) FILTER (WHERE i.impact = 'moderate' AND (i.tier IS NULL OR i.tier != 'advisory')), 0) as moderate_count,
  COALESCE(COUNT(i.id) FILTER (WHERE i.impact = 'minor' AND (i.tier IS NULL OR i.tier != 'advisory')), 0) as minor_count
FROM sites s
LEFT JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
LEFT JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
GROUP BY s.team_id, s.id, DATE(sc.created_at);

COMMENT ON VIEW violations_trend_view IS 'Daily violation trends - violations only (excludes advisories)';

-- =====================================================
-- VIEW 3: Top Rules (updated to exclude advisories)
-- =====================================================
CREATE VIEW top_rules_view AS
SELECT
  s.team_id,
  i.rule,
  i.description,
  i.help_url,
  COUNT(DISTINCT i.id) as violation_count,
  COUNT(DISTINCT i.scan_id) as affected_scans,
  COALESCE(
    ROUND(
      COUNT(DISTINCT i.id)::DECIMAL / NULLIF(COUNT(DISTINCT sc.id), 0) * 100,
      1
    ),
    0
  ) as prevalence_pct,
  MAX(i.impact) as max_severity,
  MIN(sc.created_at) as first_seen,
  MAX(sc.created_at) as last_seen
FROM sites s
JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
  AND (i.tier IS NULL OR i.tier != 'advisory')  -- Only violations
GROUP BY s.team_id, i.rule, i.description, i.help_url
ORDER BY violation_count DESC;

COMMENT ON VIEW top_rules_view IS 'Most common accessibility violations - violations only (excludes advisories)';

-- =====================================================
-- VIEW 4: Top Pages (updated to exclude advisories)
-- =====================================================
CREATE VIEW top_pages_view AS
SELECT
  s.team_id,
  s.id as site_id,
  s.name as site_name,
  s.url as site_url,
  sc.id as scan_id,
  sc.created_at as scan_date,
  -- Count only violations
  COUNT(DISTINCT i.id) FILTER (WHERE i.tier IS NULL OR i.tier != 'advisory') as violation_count,
  COUNT(DISTINCT i.id) FILTER (WHERE i.impact = 'critical' AND (i.tier IS NULL OR i.tier != 'advisory')) as critical_count,
  COUNT(DISTINCT i.id) FILTER (WHERE i.impact = 'serious' AND (i.tier IS NULL OR i.tier != 'advisory')) as serious_count
FROM sites s
JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
LEFT JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
GROUP BY s.team_id, s.id, s.name, s.url, sc.id, sc.created_at
ORDER BY violation_count DESC;

COMMENT ON VIEW top_pages_view IS 'Sites/pages with most violations - violations only (excludes advisories)';

-- =====================================================
-- VIEW 5: Backlog Age (updated to exclude advisories)
-- =====================================================
CREATE VIEW backlog_age_view AS
SELECT
  s.team_id,
  i.impact,
  COUNT(DISTINCT i.id) as issue_count,
  ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - sc.created_at)) / 86400)::NUMERIC, 1) as avg_age_days,
  ROUND(MAX(EXTRACT(EPOCH FROM (NOW() - sc.created_at)) / 86400)::NUMERIC, 1) as max_age_days
FROM sites s
JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
  AND (i.tier IS NULL OR i.tier != 'advisory')  -- Only violations
  AND i.github_issue_url IS NULL  -- Not yet ticketed
GROUP BY s.team_id, i.impact;

COMMENT ON VIEW backlog_age_view IS 'Age of open violations by severity - violations only (excludes advisories)';

-- =====================================================
-- VIEW 6: Fix Throughput (updated to exclude advisories)
-- =====================================================
CREATE VIEW fix_throughput_view AS
SELECT
  s.team_id,
  DATE(i.github_issue_created_at) as date,
  COUNT(DISTINCT i.id) as issues_ticketed
FROM sites s
JOIN scans sc ON s.id = sc.site_id
JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
  AND (i.tier IS NULL OR i.tier != 'advisory')  -- Only violations
  AND i.github_issue_created_at IS NOT NULL
GROUP BY s.team_id, DATE(i.github_issue_created_at);

COMMENT ON VIEW fix_throughput_view IS 'Daily fix throughput metrics - violations only (excludes advisories). Note: Closed/resolved tracking requires GitHub webhook integration.';

-- =====================================================
-- VIEW 7: Risk Reduced (updated to exclude advisories)
-- =====================================================
CREATE VIEW risk_reduced_view AS
WITH severity_counts AS (
  SELECT
    s.team_id,
    sc.id as scan_id,
    sc.created_at,
    COUNT(DISTINCT i.id) FILTER (WHERE i.impact = 'critical' AND (i.tier IS NULL OR i.tier != 'advisory')) as critical_count,
    COUNT(DISTINCT i.id) FILTER (WHERE i.impact = 'serious' AND (i.tier IS NULL OR i.tier != 'advisory')) as serious_count,
    COUNT(DISTINCT i.id) FILTER (WHERE i.impact = 'moderate' AND (i.tier IS NULL OR i.tier != 'advisory')) as moderate_count,
    COUNT(DISTINCT i.id) FILTER (WHERE i.impact = 'minor' AND (i.tier IS NULL OR i.tier != 'advisory')) as minor_count
  FROM sites s
  JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
  LEFT JOIN issues i ON sc.id = i.scan_id
  WHERE s.team_id IS NOT NULL
  GROUP BY s.team_id, sc.id, sc.created_at
)
SELECT
  team_id,
  scan_id,
  created_at,
  -- Research-based weights (per risk-methodology.ts)
  (critical_count * 50000 + serious_count * 15000 + moderate_count * 3000 + minor_count * 500) as estimated_risk,
  critical_count,
  serious_count,
  moderate_count,
  minor_count
FROM severity_counts;

COMMENT ON VIEW risk_reduced_view IS 'Estimated legal exposure by scan (WCAG violations only, excludes advisories) - $50k/critical, $15k/serious, $3k/moderate, $500/minor';

-- =====================================================
-- VIEW 8: Tickets Created (updated to exclude advisories)
-- =====================================================
CREATE VIEW tickets_view AS
SELECT
  s.team_id,
  i.id as issue_id,
  i.rule,
  i.impact,
  i.github_issue_url,
  i.github_issue_number,
  i.github_issue_created_at,
  sc.created_at as scan_date,
  s.name as site_name
FROM sites s
JOIN scans sc ON s.id = sc.site_id AND sc.status = 'completed'
JOIN issues i ON sc.id = i.scan_id
WHERE s.team_id IS NOT NULL
  AND (i.tier IS NULL OR i.tier != 'advisory')  -- Only violations
  AND i.github_issue_url IS NOT NULL;

COMMENT ON VIEW tickets_view IS 'GitHub issues created from violations - violations only (excludes advisories)';

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT SELECT ON report_kpis_view TO authenticated, service_role;
GRANT SELECT ON violations_trend_view TO authenticated, service_role;
GRANT SELECT ON fix_throughput_view TO authenticated, service_role;
GRANT SELECT ON top_rules_view TO authenticated, service_role;
GRANT SELECT ON top_pages_view TO authenticated, service_role;
GRANT SELECT ON backlog_age_view TO authenticated, service_role;
GRANT SELECT ON tickets_view TO authenticated, service_role;
GRANT SELECT ON risk_reduced_view TO authenticated, service_role;
*/


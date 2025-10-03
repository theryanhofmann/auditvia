-- =====================================================
-- UPDATE RISK METHODOLOGY TO RESEARCH-BASED VALUES
-- Migration: Update risk_reduced_view with industry-backed weights
-- =====================================================

-- Drop existing view
DROP VIEW IF EXISTS risk_reduced_view CASCADE;

-- =====================================================
-- VIEW: Risk Reduced (Updated with Research-Based Values)
-- 
-- Methodology: Industry-backed risk assessment
-- Sources:
--   - Seyfarth Shaw LLP: ADA Title III Lawsuit Report (2023)
--   - UsableNet: Digital Accessibility Lawsuit Report (2023)
--   - Deque Systems: Remediation Cost Analysis (2023)
--   - DOJ ADA Settlement Database (2024)
--
-- Risk Weights (Estimated Legal Exposure + Remediation Costs):
--   Critical: $50,000  (Avg ADA lawsuit settlement: $20k-$100k)
--   Serious:  $15,000  (Remediation cost + legal risk)
--   Moderate: $3,000   (Developer time + QA testing)
--   Minor:    $500     (Time to fix + testing)
--
-- ⚠️ DISCLAIMER: Estimates for business planning only.
--    Actual legal outcomes vary by jurisdiction and case specifics.
-- =====================================================

CREATE OR REPLACE VIEW risk_reduced_view AS
WITH severity_weights AS (
  -- Research-based risk values (updated 2024-10-02)
  SELECT 'critical' as severity, 50000 as risk_value
  UNION ALL SELECT 'serious', 15000
  UNION ALL SELECT 'moderate', 3000
  UNION ALL SELECT 'minor', 500
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

-- Update comment with methodology
COMMENT ON VIEW risk_reduced_view IS 
'Estimated legal exposure reduction based on industry research. 
Risk values: Critical=$50k, Serious=$15k, Moderate=$3k, Minor=$500. 
Sources: Seyfarth Shaw (2023), UsableNet (2023), Deque Systems (2023), DOJ ADA Database (2024).
⚠️ Estimates for planning purposes only. Actual legal outcomes vary.';

-- Grant permissions
GRANT SELECT ON risk_reduced_view TO authenticated, service_role;

-- =====================================================
-- Add team-level risk configuration table (for future enterprise feature)
-- =====================================================

CREATE TABLE IF NOT EXISTS team_risk_config (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  
  -- Custom risk weights (NULL = use defaults)
  risk_critical INTEGER,
  risk_serious INTEGER,
  risk_moderate INTEGER,
  risk_minor INTEGER,
  
  -- Preset selection
  risk_preset TEXT CHECK (risk_preset IN ('research', 'conservative', 'aggressive', 'custom')),
  
  -- Metadata
  configured_by UUID REFERENCES users(id),
  configured_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE team_risk_config IS 
'Enterprise feature: Custom risk assessment weights per team. 
Allows organizations to calibrate risk calculations to their specific legal/insurance requirements.';

-- Enable RLS
ALTER TABLE team_risk_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their team risk config"
  ON team_risk_config FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can update risk config"
  ON team_risk_config FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON team_risk_config TO authenticated;
GRANT ALL ON team_risk_config TO service_role;

-- Create updated_at trigger
CREATE TRIGGER update_team_risk_config_updated_at
  BEFORE UPDATE ON team_risk_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


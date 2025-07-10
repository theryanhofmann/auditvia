-- Create scan trends table
CREATE TABLE scan_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    previous_scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    score_change NUMERIC(5,2),
    new_issues_count INTEGER NOT NULL DEFAULT 0,
    resolved_issues_count INTEGER NOT NULL DEFAULT 0,
    critical_issues_delta INTEGER NOT NULL DEFAULT 0,
    serious_issues_delta INTEGER NOT NULL DEFAULT 0,
    moderate_issues_delta INTEGER NOT NULL DEFAULT 0,
    minor_issues_delta INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_scan_trends_scan_id ON scan_trends(scan_id);
CREATE INDEX idx_scan_trends_site_id ON scan_trends(site_id);
CREATE INDEX idx_scan_trends_created_at ON scan_trends(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE scan_trends ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view scan trends for their own sites" ON scan_trends
    FOR SELECT USING (
        site_id IN (
            SELECT id FROM sites WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can insert scan trends" ON scan_trends
    FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON scan_trends TO authenticated;

-- Create a view for site trend statistics
CREATE VIEW site_trend_stats AS
SELECT 
    s.id as site_id,
    s.url,
    s.name as site_name,
    s.user_id,
    COUNT(st.id) as total_scans,
    AVG(st.score_change) as avg_score_change,
    SUM(st.new_issues_count) as total_new_issues,
    SUM(st.resolved_issues_count) as total_resolved_issues,
    SUM(st.critical_issues_delta) as critical_issues_trend,
    SUM(st.serious_issues_delta) as serious_issues_trend,
    SUM(st.moderate_issues_delta) as moderate_issues_trend,
    SUM(st.minor_issues_delta) as minor_issues_trend,
    MAX(st.created_at) as last_scan_at
FROM sites s
LEFT JOIN scan_trends st ON s.id = st.site_id
GROUP BY s.id;

-- Enable RLS on the view
ALTER VIEW site_trend_stats SET (security_invoker = true);
GRANT SELECT ON site_trend_stats TO authenticated; 
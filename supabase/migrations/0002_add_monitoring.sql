-- Add monitoring column to sites table
ALTER TABLE sites ADD COLUMN monitoring BOOLEAN DEFAULT false;

-- Create index for monitoring column for faster queries
CREATE INDEX idx_sites_monitoring ON sites(monitoring);

-- Monitoring logs table: stores individual monitoring scan attempts
CREATE TABLE monitoring_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL,
    score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
    violations INTEGER,
    message TEXT NOT NULL,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monitoring summary logs table: stores overall monitoring job summaries
CREATE TABLE monitoring_summary_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sites_monitored INTEGER NOT NULL DEFAULT 0,
    successful_scans INTEGER NOT NULL DEFAULT 0,
    failed_scans INTEGER NOT NULL DEFAULT 0,
    average_score NUMERIC(5,2) CHECK (average_score >= 0 AND average_score <= 100),
    total_violations INTEGER,
    execution_time_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_monitoring_logs_site_id ON monitoring_logs(site_id);
CREATE INDEX idx_monitoring_logs_success ON monitoring_logs(success);
CREATE INDEX idx_monitoring_logs_created_at ON monitoring_logs(created_at);
CREATE INDEX idx_monitoring_summary_logs_created_at ON monitoring_summary_logs(created_at);

-- Enable Row Level Security (RLS) on monitoring tables
ALTER TABLE monitoring_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_summary_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monitoring_logs table
-- Users can only see monitoring logs for their own sites
CREATE POLICY "Users can view monitoring logs for their own sites" ON monitoring_logs
    FOR SELECT USING (
        site_id IN (
            SELECT id FROM sites WHERE user_id = auth.uid()
        )
    );

-- Service role can insert monitoring logs (for edge functions)
CREATE POLICY "Service role can insert monitoring logs" ON monitoring_logs
    FOR INSERT WITH CHECK (true);

-- RLS Policies for monitoring_summary_logs table
-- Only authenticated users can view summary logs (admin-level access)
CREATE POLICY "Authenticated users can view monitoring summary logs" ON monitoring_summary_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can insert summary logs (for edge functions)
CREATE POLICY "Service role can insert monitoring summary logs" ON monitoring_summary_logs
    FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON monitoring_logs TO authenticated;
GRANT ALL ON monitoring_summary_logs TO authenticated;

-- Create a view for monitoring statistics
CREATE VIEW monitoring_stats AS
SELECT 
    s.id as site_id,
    s.url,
    s.name as site_name,
    s.user_id,
    s.monitoring,
    COUNT(ml.id) as total_monitoring_runs,
    COUNT(CASE WHEN ml.success = true THEN 1 END) as successful_runs,
    COUNT(CASE WHEN ml.success = false THEN 1 END) as failed_runs,
    AVG(CASE WHEN ml.success = true THEN ml.score END) as average_score,
    SUM(CASE WHEN ml.success = true THEN ml.violations END) as total_violations,
    MAX(ml.created_at) as last_monitored_at
FROM sites s
LEFT JOIN monitoring_logs ml ON s.id = ml.site_id
WHERE s.monitoring = true
GROUP BY s.id;

-- Enable RLS on the view
ALTER VIEW monitoring_stats SET (security_invoker = true);
GRANT SELECT ON monitoring_stats TO authenticated; 
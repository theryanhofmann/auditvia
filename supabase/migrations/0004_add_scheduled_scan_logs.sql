-- Create scheduled_scan_logs table for tracking automated scan execution
CREATE TABLE scheduled_scan_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
    scanned_url TEXT NOT NULL,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_scheduled_scan_logs_site_id ON scheduled_scan_logs(site_id);
CREATE INDEX idx_scheduled_scan_logs_status ON scheduled_scan_logs(status);
CREATE INDEX idx_scheduled_scan_logs_created_at ON scheduled_scan_logs(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE scheduled_scan_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see logs for their own sites
CREATE POLICY "Users can view scheduled scan logs for their own sites" ON scheduled_scan_logs
    FOR SELECT USING (
        site_id IN (
            SELECT id FROM sites WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Only service calls can insert logs (Edge Functions)
CREATE POLICY "Service can insert scheduled scan logs" ON scheduled_scan_logs
    FOR INSERT WITH CHECK (true);

-- Add comment to explain the purpose
COMMENT ON TABLE scheduled_scan_logs IS 'Tracks the execution of scheduled accessibility scans, including success/failure status and error details for debugging.';

-- Grant necessary permissions
GRANT SELECT ON scheduled_scan_logs TO authenticated;
GRANT INSERT ON scheduled_scan_logs TO service_role; 
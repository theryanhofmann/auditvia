-- Create scan_logs table for tracking automated scans
CREATE TABLE scan_logs (
    id SERIAL PRIMARY KEY,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    run_at TIMESTAMPTZ DEFAULT NOW(),
    success BOOLEAN NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for better query performance
CREATE INDEX idx_scan_logs_site_id ON scan_logs(site_id);
CREATE INDEX idx_scan_logs_run_at ON scan_logs(run_at);

-- Add monitoring column to sites table if it doesn't exist
ALTER TABLE sites ADD COLUMN IF NOT EXISTS monitoring BOOLEAN DEFAULT false;

-- Create index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_sites_monitoring ON sites(monitoring) WHERE monitoring = true; 
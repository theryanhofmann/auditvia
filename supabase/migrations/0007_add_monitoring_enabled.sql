-- Add monitoring_enabled column to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN DEFAULT false;

-- Add comment to explain the purpose
COMMENT ON COLUMN sites.monitoring_enabled IS 'Whether automated monitoring is enabled for this site';

-- Update existing rows to have monitoring_enabled = false
UPDATE sites SET monitoring_enabled = false WHERE monitoring_enabled IS NULL; 
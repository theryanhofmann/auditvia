-- Harden scans table schema to prevent 404s during scan runs
-- Add missing error_message column and ensure proper defaults

-- Add error_message column if it doesn't exist
ALTER TABLE scans ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Ensure status has proper default and NOT NULL constraint
ALTER TABLE scans ALTER COLUMN status SET DEFAULT 'running';
ALTER TABLE scans ALTER COLUMN status SET NOT NULL;

-- Ensure created_at has proper default and NOT NULL constraint  
ALTER TABLE scans ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE scans ALTER COLUMN created_at SET NOT NULL;

-- Add updated_at column if it doesn't exist with proper default
ALTER TABLE scans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill any scans with NULL status to 'completed' if they have results
UPDATE scans 
SET status = 'completed' 
WHERE status IS NULL 
  AND (total_violations IS NOT NULL OR passes IS NOT NULL);

-- Backfill any remaining NULL status to 'running'
UPDATE scans 
SET status = 'running' 
WHERE status IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN scans.error_message IS 'Stores error details when a scan fails, helping with debugging and user feedback.';
COMMENT ON COLUMN scans.status IS 'Current scan status: running (default), completed, failed. Never NULL.';
COMMENT ON COLUMN scans.updated_at IS 'Timestamp when scan record was last modified.';

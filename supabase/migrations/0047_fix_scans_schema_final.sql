-- Fix scans table schema to align with code expectations
-- This migration ensures all columns exist with correct names and types

-- Add missing columns if they don't exist
ALTER TABLE scans ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS total_violations INTEGER DEFAULT 0;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS passes INTEGER DEFAULT 0;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS incomplete INTEGER DEFAULT 0;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS inapplicable INTEGER DEFAULT 0;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS scan_time_ms INTEGER;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE scans ADD COLUMN IF NOT EXISTS public BOOLEAN DEFAULT false;

-- Ensure status column has proper constraints and default
ALTER TABLE scans ALTER COLUMN status SET DEFAULT 'running';
ALTER TABLE scans ALTER COLUMN status SET NOT NULL;

-- Ensure created_at has proper default and NOT NULL constraint
ALTER TABLE scans ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE scans ALTER COLUMN created_at SET NOT NULL;

-- Add completed_at as alias for finished_at (some code expects this name)
ALTER TABLE scans ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Update completed_at to match finished_at for existing records
UPDATE scans SET completed_at = finished_at WHERE completed_at IS NULL AND finished_at IS NOT NULL;

-- Backfill user_id from sites table if NULL
UPDATE scans s
SET user_id = sites.user_id
FROM sites
WHERE s.site_id = sites.id AND s.user_id IS NULL;

-- Backfill status for any NULL values
UPDATE scans 
SET status = 'completed' 
WHERE status IS NULL 
  AND (total_violations IS NOT NULL OR passes IS NOT NULL OR finished_at IS NOT NULL);

UPDATE scans 
SET status = 'running' 
WHERE status IS NULL;

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_site_id ON scans(site_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);

-- Update the update_scan_record function to handle error_message
DROP FUNCTION IF EXISTS update_scan_record(UUID, TEXT, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION update_scan_record(
  p_scan_id UUID,
  p_status TEXT,
  p_finished_at TIMESTAMPTZ,
  p_total_violations INTEGER,
  p_passes INTEGER,
  p_incomplete INTEGER,
  p_inapplicable INTEGER,
  p_scan_time_ms INTEGER,
  p_error_message TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE scans
  SET 
    status = p_status,
    finished_at = p_finished_at,
    completed_at = p_finished_at, -- Keep both columns in sync
    total_violations = p_total_violations,
    passes = p_passes,
    incomplete = p_incomplete,
    inapplicable = p_inapplicable,
    scan_time_ms = p_scan_time_ms,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_scan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_scan_record(UUID, TEXT, TIMESTAMPTZ, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN scans.error_message IS 'Stores error details when a scan fails, helping with debugging and user feedback.';
COMMENT ON COLUMN scans.status IS 'Current scan status: running (default), completed, failed. Never NULL.';
COMMENT ON COLUMN scans.completed_at IS 'Alias for finished_at to support different naming conventions in code.';
COMMENT ON COLUMN scans.total_violations IS 'Total number of accessibility violations found.';
COMMENT ON COLUMN scans.updated_at IS 'Timestamp when scan record was last modified.';

-- Final scans schema cleanup and optimization
-- This migration ensures clean schema state and removes legacy artifacts

-- Ensure error_message column exists and is nullable
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scans' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE scans ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- Ensure finished_at exists (should already exist from previous migrations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scans' AND column_name = 'finished_at'
  ) THEN
    ALTER TABLE scans ADD COLUMN finished_at TIMESTAMPTZ;
  END IF;
END $$;

-- Drop legacy completed_at column to prevent future drift
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scans' AND column_name = 'completed_at'
  ) THEN
    -- First migrate any data from completed_at to finished_at if needed
    UPDATE scans 
    SET finished_at = completed_at 
    WHERE finished_at IS NULL AND completed_at IS NOT NULL;
    
    -- Drop the legacy column
    ALTER TABLE scans DROP COLUMN completed_at;
  END IF;
END $$;

-- Ensure critical indexes exist for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS scans_id_idx ON scans(id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS scans_site_id_idx ON scans(site_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS scans_status_idx ON scans(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS scans_user_id_idx ON scans(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS scans_created_at_idx ON scans(created_at DESC);

-- Remove the RPC function since we use direct table updates
DROP FUNCTION IF EXISTS update_scan_record CASCADE;

-- Add helpful comments for documentation
COMMENT ON TABLE scans IS 'Accessibility scan records with direct table updates (no RPC)';
COMMENT ON COLUMN scans.error_message IS 'Nullable error message for failed scans';
COMMENT ON COLUMN scans.finished_at IS 'Scan completion timestamp (replaces legacy completed_at)';
COMMENT ON COLUMN scans.status IS 'Scan status: running, completed, failed';

-- Verify schema consistency
DO $$
DECLARE
  missing_cols TEXT[];
BEGIN
  -- Check for required columns
  SELECT ARRAY_AGG(col) INTO missing_cols
  FROM (
    SELECT unnest(ARRAY['id', 'site_id', 'user_id', 'status', 'started_at', 'finished_at', 
                        'total_violations', 'passes', 'incomplete', 'inapplicable', 
                        'scan_time_ms', 'error_message', 'created_at', 'updated_at']) AS col
  ) required_cols
  WHERE col NOT IN (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'scans'
  );
  
  IF array_length(missing_cols, 1) > 0 THEN
    RAISE EXCEPTION 'Missing required columns in scans table: %', array_to_string(missing_cols, ', ');
  END IF;
  
  RAISE NOTICE 'Schema verification passed: all required columns present';
END $$;

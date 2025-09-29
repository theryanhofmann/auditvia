-- Fix endless scan loop: add missing columns, backfill stuck scans, and optimize indexes
-- This migration ensures scans always reach a terminal state (completed/failed)

-- Add ended_at column if it doesn't exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scans' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE scans ADD COLUMN ended_at TIMESTAMPTZ;
    COMMENT ON COLUMN scans.ended_at IS 'Timestamp when scan reached terminal state (completed/failed)';
  END IF;
END $$;

-- Ensure error_message column exists (should exist from previous migrations but be safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scans' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE scans ADD COLUMN error_message TEXT;
    COMMENT ON COLUMN scans.error_message IS 'Error details when scan fails, null for successful scans';
  END IF;
END $$;

-- Ensure status column supports all required values
-- Update constraint to include all valid statuses
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'scans' AND constraint_name = 'scans_status_check'
  ) THEN
    ALTER TABLE scans DROP CONSTRAINT scans_status_check;
  END IF;
  
  -- Add updated constraint with all valid statuses
  ALTER TABLE scans ADD CONSTRAINT scans_status_check 
    CHECK (status IN ('queued', 'running', 'completed', 'failed'));
END $$;

-- Backfill ended_at for existing completed/failed scans
UPDATE scans 
SET ended_at = COALESCE(finished_at, updated_at, created_at)
WHERE ended_at IS NULL 
  AND status IN ('completed', 'failed');

-- Auto-fail ancient running scans (older than 15 minutes)
UPDATE scans 
SET 
  status = 'failed',
  error_message = 'Timed out – auto-marked failed during system maintenance',
  ended_at = NOW(),
  updated_at = NOW()
WHERE status = 'running' 
  AND created_at < NOW() - INTERVAL '15 minutes'
  AND ended_at IS NULL;

-- Create optimized indexes for scan queries (idempotent)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_site_created_desc 
  ON scans(site_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_status_created 
  ON scans(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_user_created 
  ON scans(user_id, created_at DESC);

-- Add function to clean up stuck scans (for maintenance utility)
CREATE OR REPLACE FUNCTION cleanup_stuck_scans(
  max_age_minutes INTEGER DEFAULT 15
) RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE scans 
  SET 
    status = 'failed',
    error_message = 'Timed out – auto-marked failed by cleanup utility',
    ended_at = NOW(),
    updated_at = NOW()
  WHERE status = 'running' 
    AND created_at < NOW() - (max_age_minutes || ' minutes')::INTERVAL
    AND ended_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Log the cleanup operation
  RAISE NOTICE 'Cleaned up % stuck running scans older than % minutes', updated_count, max_age_minutes;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role for maintenance
GRANT EXECUTE ON FUNCTION cleanup_stuck_scans(INTEGER) TO service_role;

-- Add helpful comments for documentation
COMMENT ON FUNCTION cleanup_stuck_scans(INTEGER) IS 'Maintenance utility to mark ancient running scans as failed';
COMMENT ON INDEX idx_scans_site_created_desc IS 'Optimized for site scan history queries';
COMMENT ON INDEX idx_scans_status_created IS 'Optimized for status-based scan queries with recency';
COMMENT ON INDEX idx_scans_user_created IS 'Optimized for user scan history queries';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 0052_fix_scan_robustness completed successfully';
  RAISE NOTICE 'Added ended_at column, backfilled terminal states, created indexes';
  RAISE NOTICE 'Auto-failed % ancient running scans', (
    SELECT COUNT(*) FROM scans 
    WHERE status = 'failed' 
      AND error_message = 'Timed out – auto-marked failed during system maintenance'
  );
END $$;

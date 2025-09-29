-- Scan Lifecycle Hardening: Add heartbeat monitoring and schema-cache resilience
-- This migration adds the infrastructure needed to eliminate endless scanning loops

-- Add heartbeat and lifecycle management columns
DO $$
BEGIN
  -- Add last_activity_at for heartbeat monitoring
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scans' AND column_name = 'last_activity_at'
  ) THEN
    ALTER TABLE scans ADD COLUMN last_activity_at TIMESTAMPTZ;
    COMMENT ON COLUMN scans.last_activity_at IS 'Last heartbeat timestamp during scan execution';
  END IF;

  -- Add cleanup_reason for operational tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scans' AND column_name = 'cleanup_reason'
  ) THEN
    ALTER TABLE scans ADD COLUMN cleanup_reason TEXT;
    COMMENT ON COLUMN scans.cleanup_reason IS 'Reason for cleanup/maintenance actions (e.g., cleanup_stuck_scans)';
  END IF;

  -- Add configurable timeout settings
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scans' AND column_name = 'heartbeat_interval_seconds'
  ) THEN
    ALTER TABLE scans ADD COLUMN heartbeat_interval_seconds INTEGER DEFAULT 30;
    COMMENT ON COLUMN scans.heartbeat_interval_seconds IS 'Expected heartbeat frequency in seconds';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scans' AND column_name = 'max_runtime_minutes'
  ) THEN
    ALTER TABLE scans ADD COLUMN max_runtime_minutes INTEGER DEFAULT 15;
    COMMENT ON COLUMN scans.max_runtime_minutes IS 'Maximum allowed runtime before timeout';
  END IF;

  -- Add progress_message for user visibility
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scans' AND column_name = 'progress_message'
  ) THEN
    ALTER TABLE scans ADD COLUMN progress_message TEXT;
    COMMENT ON COLUMN scans.progress_message IS 'Current progress message displayed to user';
  END IF;
END $$;

-- Backfill last_activity_at for existing scans
UPDATE scans 
SET last_activity_at = COALESCE(updated_at, created_at)
WHERE last_activity_at IS NULL;

-- Set environment-specific defaults based on current environment
-- Development: shorter timeouts for faster feedback
-- Production: longer timeouts for reliability
DO $$
DECLARE
  is_dev BOOLEAN := (SELECT current_setting('app.environment', true) = 'development');
BEGIN
  IF is_dev THEN
    -- Development defaults: 5 minute timeout, 15 second heartbeat
    UPDATE scans SET 
      max_runtime_minutes = 5,
      heartbeat_interval_seconds = 15
    WHERE max_runtime_minutes = 15; -- Only update defaults
  ELSE
    -- Production/staging defaults: 15 minute timeout, 30 second heartbeat
    UPDATE scans SET 
      max_runtime_minutes = 15,
      heartbeat_interval_seconds = 30
    WHERE max_runtime_minutes IS NULL OR heartbeat_interval_seconds IS NULL;
  END IF;
END $$;

-- Create index for maintenance queries (cleanup stuck scans)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_status_activity 
  ON scans(status, last_activity_at) 
  WHERE status = 'running';

-- Create index for heartbeat staleness queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scans_heartbeat_staleness 
  ON scans(last_activity_at, status, created_at);

-- Enhanced cleanup function with heartbeat awareness
CREATE OR REPLACE FUNCTION cleanup_stuck_scans_v2(
  max_age_minutes INTEGER DEFAULT 15,
  heartbeat_stale_minutes INTEGER DEFAULT 5,
  dry_run BOOLEAN DEFAULT false
) RETURNS TABLE(
  scan_id UUID,
  reason TEXT,
  age_minutes INTEGER,
  heartbeat_age_minutes INTEGER
) AS $$
DECLARE
  cleanup_count INTEGER := 0;
BEGIN
  -- Return scans that would be cleaned up
  RETURN QUERY
  SELECT 
    s.id as scan_id,
    CASE 
      WHEN s.created_at < NOW() - (max_age_minutes || ' minutes')::INTERVAL THEN 'runtime_timeout'
      WHEN s.last_activity_at < NOW() - (heartbeat_stale_minutes || ' minutes')::INTERVAL THEN 'heartbeat_stale'
      ELSE 'unknown'
    END as reason,
    EXTRACT(EPOCH FROM (NOW() - s.created_at))::INTEGER / 60 as age_minutes,
    EXTRACT(EPOCH FROM (NOW() - s.last_activity_at))::INTEGER / 60 as heartbeat_age_minutes
  FROM scans s
  WHERE s.status = 'running'
    AND (
      s.created_at < NOW() - (max_age_minutes || ' minutes')::INTERVAL OR
      s.last_activity_at < NOW() - (heartbeat_stale_minutes || ' minutes')::INTERVAL
    );

  -- If not dry run, perform the cleanup
  IF NOT dry_run THEN
    UPDATE scans 
    SET 
      status = 'failed',
      ended_at = NOW(),
      updated_at = NOW(),
      cleanup_reason = CASE 
        WHEN created_at < NOW() - (max_age_minutes || ' minutes')::INTERVAL THEN 'cleanup_stuck_scans_runtime_timeout'
        WHEN last_activity_at < NOW() - (heartbeat_stale_minutes || ' minutes')::INTERVAL THEN 'cleanup_stuck_scans_heartbeat_stale'
        ELSE 'cleanup_stuck_scans_unknown'
      END,
      error_message = CASE 
        WHEN created_at < NOW() - (max_age_minutes || ' minutes')::INTERVAL THEN 'Scan exceeded maximum runtime limit and was automatically failed'
        WHEN last_activity_at < NOW() - (heartbeat_stale_minutes || ' minutes')::INTERVAL THEN 'Scan heartbeat became stale and was automatically failed'
        ELSE 'Scan was automatically failed during maintenance cleanup'
      END
    WHERE status = 'running'
      AND (
        created_at < NOW() - (max_age_minutes || ' minutes')::INTERVAL OR
        last_activity_at < NOW() - (heartbeat_stale_minutes || ' minutes')::INTERVAL
      );
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % stuck scans (max_age: %min, heartbeat_stale: %min)', 
      cleanup_count, max_age_minutes, heartbeat_stale_minutes;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update scan heartbeat (used by lifecycle manager)
CREATE OR REPLACE FUNCTION update_scan_heartbeat(
  scan_id UUID,
  progress_msg TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE scans 
  SET 
    last_activity_at = NOW(),
    updated_at = NOW(),
    progress_message = COALESCE(progress_msg, progress_message)
  WHERE id = scan_id 
    AND status IN ('queued', 'running');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for atomic terminal state transitions
CREATE OR REPLACE FUNCTION transition_scan_to_terminal(
  scan_id UUID,
  new_status TEXT,
  end_time TIMESTAMPTZ DEFAULT NOW(),
  error_msg TEXT DEFAULT NULL,
  final_progress_msg TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate status
  IF new_status NOT IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid terminal status: %. Must be completed or failed.', new_status;
  END IF;

  UPDATE scans 
  SET 
    status = new_status,
    ended_at = end_time,
    last_activity_at = end_time,
    updated_at = end_time,
    error_message = CASE WHEN new_status = 'failed' THEN COALESCE(error_msg, error_message) ELSE error_message END,
    progress_message = COALESCE(final_progress_msg, 
      CASE 
        WHEN new_status = 'completed' THEN 'Scan completed successfully'
        WHEN new_status = 'failed' THEN 'Scan failed'
      END
    )
  WHERE id = scan_id 
    AND status IN ('queued', 'running');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to service role for lifecycle management
GRANT EXECUTE ON FUNCTION cleanup_stuck_scans_v2(INTEGER, INTEGER, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION update_scan_heartbeat(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION transition_scan_to_terminal(UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO service_role;

-- Update RLS policies to ensure service role can manage scan lifecycle
DO $$
BEGIN
  -- Ensure service role can update all lifecycle fields
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'scans' AND policyname = 'service_role_lifecycle_management'
  ) THEN
    CREATE POLICY service_role_lifecycle_management ON scans
      FOR UPDATE TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  -- Ensure service role can insert violations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'violations' AND policyname = 'service_role_violation_insert'
  ) THEN
    CREATE POLICY service_role_violation_insert ON violations
      FOR INSERT TO service_role
      WITH CHECK (true);
  END IF;
END $$;

-- Create scan lifecycle events table for observability
CREATE TABLE IF NOT EXISTS scan_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'scan_started', 'heartbeat_updated', 'progress_updated', 
    'scan_completed', 'scan_failed', 'schema_recovery_attempted',
    'schema_recovery_succeeded', 'schema_recovery_failed',
    'cleanup_performed', 'ui_polling_stopped'
  )),
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for lifecycle events
CREATE INDEX IF NOT EXISTS idx_scan_lifecycle_events_scan_created 
  ON scan_lifecycle_events(scan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scan_lifecycle_events_type_created 
  ON scan_lifecycle_events(event_type, created_at DESC);

-- Grant permissions for lifecycle events
GRANT SELECT, INSERT ON scan_lifecycle_events TO service_role;
GRANT SELECT ON scan_lifecycle_events TO authenticated;

-- RLS for lifecycle events
ALTER TABLE scan_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY scan_lifecycle_events_service_role ON scan_lifecycle_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY scan_lifecycle_events_user_read ON scan_lifecycle_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM scans s 
      WHERE s.id = scan_lifecycle_events.scan_id 
        AND s.user_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON TABLE scan_lifecycle_events IS 'Audit trail of scan lifecycle events for observability';
COMMENT ON FUNCTION cleanup_stuck_scans_v2(INTEGER, INTEGER, BOOLEAN) IS 'Enhanced cleanup with heartbeat awareness and dry-run support';
COMMENT ON FUNCTION update_scan_heartbeat(UUID, TEXT) IS 'Updates scan heartbeat timestamp and optional progress message';
COMMENT ON FUNCTION transition_scan_to_terminal(UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) IS 'Atomically transitions scan to terminal state (completed/failed)';

-- Log migration completion
DO $$
DECLARE
  running_count INTEGER;
  total_scans INTEGER;
BEGIN
  SELECT COUNT(*) INTO running_count FROM scans WHERE status = 'running';
  SELECT COUNT(*) INTO total_scans FROM scans;
  
  RAISE NOTICE 'Migration 0053_scan_lifecycle_hardening completed successfully';
  RAISE NOTICE 'Added heartbeat monitoring, cleanup functions, and lifecycle events';
  RAISE NOTICE 'Current state: % running scans out of % total', running_count, total_scans;
  RAISE NOTICE 'Heartbeat monitoring enabled with 30s intervals and 15min timeouts';
END $$;

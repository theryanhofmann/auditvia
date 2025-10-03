-- Phase B: Create RPC functions and RLS updates for scan lifecycle hardening
-- This must be run AFTER Phase A migration is complete

-- Create heartbeat update function
CREATE OR REPLACE FUNCTION update_scan_heartbeat(
  scan_id UUID,
  progress_msg TEXT DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE scans
  SET
    last_activity_at = NOW(),
    progress_message = COALESCE(progress_msg, progress_message),
    updated_at = NOW()
  WHERE id = scan_id AND status IN ('running', 'queued');

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Log the heartbeat event for observability
  INSERT INTO scan_lifecycle_events (scan_id, event_type, metadata)
  VALUES (scan_id, 'heartbeat_updated', jsonb_build_object(
    'progress_message', progress_msg,
    'timestamp', NOW()
  )) ON CONFLICT DO NOTHING;

  RETURN updated_count > 0;
END;
$$;

-- Create terminal transition function
CREATE OR REPLACE FUNCTION transition_scan_to_terminal(
  scan_id UUID,
  new_status TEXT,
  error_msg TEXT DEFAULT NULL,
  user_id UUID DEFAULT NULL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Validate status
  IF new_status NOT IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid terminal status: %', new_status;
  END IF;

  UPDATE scans
  SET
    status = new_status,
    ended_at = NOW(),
    last_activity_at = NOW(),
    error_message = CASE WHEN new_status = 'failed' THEN COALESCE(error_msg, error_message) ELSE error_message END,
    updated_at = NOW()
  WHERE id = scan_id AND status IN ('running', 'queued');

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Log the terminal transition
  INSERT INTO scan_lifecycle_events (scan_id, event_type, metadata)
  VALUES (scan_id, 'scan_' || new_status, jsonb_build_object(
    'error_message', error_msg,
    'user_id', user_id,
    'timestamp', NOW()
  )) ON CONFLICT DO NOTHING;

  RETURN updated_count > 0;
END;
$$;

-- Create scan lifecycle events table for observability
CREATE TABLE IF NOT EXISTS scan_lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_lifecycle_events_scan_id ON scan_lifecycle_events (scan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_lifecycle_events_type ON scan_lifecycle_events (event_type, created_at DESC);

-- Create improved cleanup function (drop old version first to avoid return type conflicts)
DROP FUNCTION IF EXISTS cleanup_stuck_scans_v2(INTEGER, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION cleanup_stuck_scans_v2(
  max_runtime_minutes INTEGER DEFAULT 15,
  heartbeat_stale_minutes INTEGER DEFAULT 5,
  dry_run BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
  scan_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  runtime_minutes INTEGER,
  reason TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.status,
    s.created_at,
    s.last_activity_at,
    EXTRACT(EPOCH FROM (NOW() - s.created_at))/60::INTEGER as runtime_minutes,
    CASE
      WHEN s.status = 'running' AND (NOW() - s.created_at) > (max_runtime_minutes || ' minutes')::INTERVAL
      THEN 'runtime_timeout'
      WHEN s.status = 'running' AND s.last_activity_at < (NOW() - (heartbeat_stale_minutes || ' minutes')::INTERVAL)
      THEN 'heartbeat_stale'
      ELSE 'unknown'
    END as reason
  FROM scans s
  WHERE s.status = 'running'
    AND (
      (NOW() - s.created_at) > (max_runtime_minutes || ' minutes')::INTERVAL
      OR s.last_activity_at < (NOW() - (heartbeat_stale_minutes || ' minutes')::INTERVAL)
    );

  -- If not dry run, mark found scans as failed
  IF NOT dry_run THEN
    UPDATE scans
    SET
      status = 'failed',
      ended_at = NOW(),
      error_message = 'Automatically marked as failed by cleanup job: ' ||
        CASE
          WHEN (NOW() - created_at) > (max_runtime_minutes || ' minutes')::INTERVAL
          THEN 'runtime_timeout'
          WHEN last_activity_at < (NOW() - (heartbeat_stale_minutes || ' minutes')::INTERVAL)
          THEN 'heartbeat_stale'
          ELSE 'unknown'
        END,
      cleanup_reason = 'automatic_cleanup'
    WHERE id IN (
      SELECT id FROM scans
      WHERE status = 'running'
        AND (
          (NOW() - created_at) > (max_runtime_minutes || ' minutes')::INTERVAL
          OR last_activity_at < (NOW() - (heartbeat_stale_minutes || ' minutes')::INTERVAL)
        )
    );

    -- Log cleanup events
    INSERT INTO scan_lifecycle_events (scan_id, event_type, metadata)
    SELECT
      id,
      'scan_failed',
      jsonb_build_object(
        'reason', 'automatic_cleanup',
        'timestamp', NOW(),
        'cleanup_thresholds', jsonb_build_object(
          'max_runtime_minutes', max_runtime_minutes,
          'heartbeat_stale_minutes', heartbeat_stale_minutes
        )
      )
    FROM scans
    WHERE status = 'failed' AND cleanup_reason = 'automatic_cleanup'
      AND updated_at > NOW() - INTERVAL '1 minute';
  END IF;
END;
$$;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION update_scan_heartbeat(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION transition_scan_to_terminal(UUID, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_stuck_scans_v2(INTEGER, INTEGER, BOOLEAN) TO service_role;

-- Ensure service role has necessary table permissions
GRANT SELECT, INSERT, UPDATE ON scan_lifecycle_events TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION update_scan_heartbeat(UUID, TEXT) IS 'Updates scan heartbeat timestamp and optional progress message';
COMMENT ON FUNCTION transition_scan_to_terminal(UUID, TEXT, TEXT, UUID) IS 'Transitions scan to terminal state (completed/failed) with metadata';
COMMENT ON FUNCTION cleanup_stuck_scans_v2(INTEGER, INTEGER, BOOLEAN) IS 'Finds and optionally cleans up stuck scans based on runtime and heartbeat thresholds';
COMMENT ON TABLE scan_lifecycle_events IS 'Audit trail of scan lifecycle events for observability';

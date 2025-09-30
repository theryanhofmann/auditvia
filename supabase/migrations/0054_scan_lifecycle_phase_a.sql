-- Phase A: Add missing columns to scans table for lifecycle hardening
-- This is safe to run multiple times due to idempotent operations

-- Add lifecycle tracking columns
ALTER TABLE scans ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE scans ADD COLUMN IF NOT EXISTS progress_message TEXT;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS heartbeat_interval_seconds INTEGER DEFAULT 30;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS max_runtime_minutes INTEGER DEFAULT 15;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS cleanup_reason TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scans_status_created_at ON scans (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_ended_at ON scans (ended_at) WHERE ended_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scans_last_activity_at ON scans (last_activity_at) WHERE last_activity_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scans_site_created_at ON scans (site_id, created_at DESC);

-- Backfill last_activity_at for existing running scans (if any)
-- This ensures existing scans have a baseline heartbeat timestamp
UPDATE scans
SET last_activity_at = created_at
WHERE last_activity_at IS NULL AND status IN ('running', 'queued');

-- Add comment for documentation
COMMENT ON COLUMN scans.ended_at IS 'When the scan reached a terminal state (completed/failed)';
COMMENT ON COLUMN scans.last_activity_at IS 'Last time scan showed activity (heartbeat)';
COMMENT ON COLUMN scans.progress_message IS 'Current progress message for the scan';
COMMENT ON COLUMN scans.heartbeat_interval_seconds IS 'Expected interval between heartbeats in seconds';
COMMENT ON COLUMN scans.max_runtime_minutes IS 'Maximum allowed runtime before considering scan stuck';
COMMENT ON COLUMN scans.cleanup_reason IS 'Reason scan was marked failed by cleanup process';

-- Add error_message column to scans table for storing scan failure details
ALTER TABLE scans ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add comment to explain the purpose
COMMENT ON COLUMN scans.error_message IS 'Stores error details when a scan fails, helping with debugging and user feedback.';

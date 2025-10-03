-- Add platform detection columns to scans table
-- This enables automatic platform detection during accessibility scans

ALTER TABLE scans 
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS platform_confidence FLOAT,
  ADD COLUMN IF NOT EXISTS platform_detected_from TEXT;

-- Add comment for documentation
COMMENT ON COLUMN scans.platform IS 'Detected website platform (webflow, wordpress, framer, nextjs, react, vue, custom)';
COMMENT ON COLUMN scans.platform_confidence IS 'Detection confidence score (0.0 to 1.0)';
COMMENT ON COLUMN scans.platform_detected_from IS 'Detection method (url, meta, html, script)';

-- Create index for querying by platform
CREATE INDEX IF NOT EXISTS idx_scans_platform ON scans(platform);


-- Migration: Add coverage summary tracking to scans table (PR #3)
-- Adds JSONB column for storing crawl metrics and budget enforcement data

-- Add coverage_summary column to scans table
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS coverage_summary JSONB NULL;

-- Add index for querying by coverage data
CREATE INDEX IF NOT EXISTS idx_scans_coverage_summary
ON scans USING gin (coverage_summary);

-- Comment on column
COMMENT ON COLUMN scans.coverage_summary IS
'Coverage summary with budget enforcement metrics: { pagesCrawled, discoveredUrls, startedAt, endedAt, profile, stopReason }';

-- Add incomplete_budget status to scans if using enum
-- Note: If scans.status is using text, this ALTER TYPE may not be needed
-- Uncomment if status is an enum type:
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_enum
--     WHERE enumlabel = 'incomplete_budget'
--     AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'scan_status')
--   ) THEN
--     ALTER TYPE scan_status ADD VALUE 'incomplete_budget';
--   END IF;
-- END $$;

-- RLS policies for coverage_summary
-- Readable by team members, writable by service role only

-- Drop existing policies if they exist (to allow updates)
DROP POLICY IF EXISTS "Team members can read scan coverage" ON scans;

-- Create policy for reading coverage summary (team members)
CREATE POLICY "Team members can read scan coverage"
ON scans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sites
    WHERE sites.id = scans.site_id
    AND (
      sites.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM team_members
        WHERE team_members.team_id = sites.team_id
        AND team_members.user_id = auth.uid()
      )
    )
  )
);

-- Note: Write access to coverage_summary is handled by service role
-- No additional policy needed as service role bypasses RLS

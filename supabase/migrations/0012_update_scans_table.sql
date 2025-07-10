-- Update scans table with new columns
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS total_violations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS passes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS incomplete INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS inapplicable INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS scan_time_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update issues table with new columns
ALTER TABLE issues
ADD COLUMN IF NOT EXISTS failure_summary TEXT,
ADD COLUMN IF NOT EXISTS wcag_rule TEXT,
ADD COLUMN IF NOT EXISTS impact TEXT CHECK (impact IN ('minor', 'moderate', 'serious', 'critical')),
ADD COLUMN IF NOT EXISTS help_url TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scans_site_id ON scans(site_id);
CREATE INDEX IF NOT EXISTS idx_issues_scan_id ON issues(scan_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);

-- Add foreign key constraint if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'issues_scan_id_fkey'
  ) THEN
    ALTER TABLE issues
    ADD CONSTRAINT issues_scan_id_fkey
    FOREIGN KEY (scan_id)
    REFERENCES scans(id)
    ON DELETE CASCADE;
  END IF;
END $$; 
-- Deep Scan v1 Prototype: Minimal schema additions
-- Goal: Support multi-page, multi-state scanning with tier classification

-- Add scan profile and metadata to scans table
ALTER TABLE scans 
  ADD COLUMN IF NOT EXISTS scan_profile TEXT DEFAULT 'quick' 
    CHECK (scan_profile IN ('quick', 'standard', 'deep')),
  ADD COLUMN IF NOT EXISTS pages_scanned INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS states_tested INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS frames_scanned INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS violations_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advisories_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scan_metadata JSONB DEFAULT '{}'::jsonb;

-- Add tier classification and context to issues table
ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'violation'
    CHECK (tier IN ('violation', 'advisory')),
  ADD COLUMN IF NOT EXISTS page_url TEXT,
  ADD COLUMN IF NOT EXISTS page_state TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS wcag_reference TEXT,
  ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT false;

-- Create index for filtering by tier
CREATE INDEX IF NOT EXISTS idx_issues_tier ON issues(tier);
CREATE INDEX IF NOT EXISTS idx_issues_page_url ON issues(page_url);

-- Add scan profile configuration to sites table
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS default_scan_profile TEXT DEFAULT 'quick'
    CHECK (default_scan_profile IN ('quick', 'standard', 'deep'));

-- Comment for clarity
COMMENT ON COLUMN scans.scan_profile IS 'Quick=1pg/1state, Standard=3pg/2states, Deep=5pg/3states';
COMMENT ON COLUMN scans.scan_metadata IS 'JSON blob with per-page results: {pages: [{url, states, issues}]}';
COMMENT ON COLUMN issues.tier IS 'violation=WCAG A/AA/AAA, advisory=best practice/manual review';
COMMENT ON COLUMN issues.page_state IS 'default, cookie-dismissed, menu-open, modal-open, etc';


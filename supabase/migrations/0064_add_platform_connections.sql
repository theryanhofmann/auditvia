-- Platform Connections Table
-- Stores OAuth tokens and connection status for platform integrations (Webflow, WordPress, etc.)

CREATE TABLE IF NOT EXISTS platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE, -- Optional: connection can be team-level or site-specific
  
  -- Platform details
  platform TEXT NOT NULL CHECK (platform IN ('webflow', 'wordpress', 'framer', 'shopify', 'wix', 'custom')),
  platform_site_id TEXT, -- The site ID in the platform (e.g., Webflow site ID)
  platform_domain TEXT, -- The domain in the platform
  
  -- OAuth tokens (encrypted)
  access_token TEXT, -- Encrypted OAuth access token
  refresh_token TEXT, -- Encrypted OAuth refresh token
  token_expires_at TIMESTAMPTZ, -- When the access token expires
  
  -- Connection status
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'error', 'expired')),
  last_synced_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Metadata
  connection_metadata JSONB DEFAULT '{}', -- Platform-specific metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(team_id, site_id, platform) -- One connection per platform per site
);

-- Indexes
CREATE INDEX idx_platform_connections_team ON platform_connections(team_id);
CREATE INDEX idx_platform_connections_site ON platform_connections(site_id);
CREATE INDEX idx_platform_connections_platform ON platform_connections(platform);
CREATE INDEX idx_platform_connections_status ON platform_connections(status);

-- Partial unique index for team-level connections (where site_id is NULL)
CREATE UNIQUE INDEX idx_platform_connections_team_level 
  ON platform_connections(team_id, platform) 
  WHERE site_id IS NULL;

-- RLS Policies
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;

-- Users can view connections for their teams
CREATE POLICY "Users can view team platform connections"
  ON platform_connections
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Only owners can insert/update/delete connections
CREATE POLICY "Team owners can manage platform connections"
  ON platform_connections
  FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Comments
COMMENT ON TABLE platform_connections IS 'Stores OAuth tokens and connection status for platform integrations';
COMMENT ON COLUMN platform_connections.platform_site_id IS 'The site ID in the external platform (e.g., Webflow site ID)';
COMMENT ON COLUMN platform_connections.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN platform_connections.refresh_token IS 'Encrypted OAuth refresh token';

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_platform_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_platform_connections_timestamp
  BEFORE UPDATE ON platform_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_connections_updated_at();


-- Fix History Table
-- Tracks all auto-fixes applied through the platform
CREATE TABLE IF NOT EXISTS fix_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  connection_id UUID NOT NULL REFERENCES platform_connections(id) ON DELETE CASCADE,
  
  -- Fix details
  issue_type TEXT NOT NULL, -- e.g., 'missing-alt', 'button-name', 'color-contrast'
  wcag_criteria TEXT[], -- e.g., ['1.1.1', '1.4.3']
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'serious', 'moderate', 'minor')),
  
  -- What was fixed
  element_selector TEXT, -- CSS selector of the fixed element
  before_value TEXT, -- What it was before
  after_value TEXT, -- What it is now
  fix_method TEXT NOT NULL, -- 'api', 'manual', 'code-push'
  
  -- Fix metadata
  preview_shown BOOLEAN DEFAULT FALSE,
  applied_by UUID REFERENCES users(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  was_dry_run BOOLEAN DEFAULT FALSE,
  
  -- Results
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'failed', 'reverted', 'verified')),
  error_message TEXT,
  verification_scan_id UUID REFERENCES scans(id) ON DELETE SET NULL, -- Scan that verified the fix
  
  -- Metadata
  fix_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_fix_history_team ON fix_history(team_id);
CREATE INDEX idx_fix_history_site ON fix_history(site_id);
CREATE INDEX idx_fix_history_scan ON fix_history(scan_id);
CREATE INDEX idx_fix_history_status ON fix_history(status);
CREATE INDEX idx_fix_history_applied_at ON fix_history(applied_at DESC);

-- RLS Policies
ALTER TABLE fix_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view fix history for their teams"
  ON fix_history
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert fix history for their teams"
  ON fix_history
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE fix_history IS 'Audit log of all auto-fixes applied through platform integrations';
COMMENT ON COLUMN fix_history.before_value IS 'The value before the fix (for rollback capability)';
COMMENT ON COLUMN fix_history.after_value IS 'The value after the fix';
COMMENT ON COLUMN fix_history.verification_scan_id IS 'Scan ID that verified the fix was successful';


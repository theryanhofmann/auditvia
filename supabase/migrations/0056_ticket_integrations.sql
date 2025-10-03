-- Migration: Ticket Integrations (GitHub/Jira)
-- Adds support for creating tickets from scan issues
-- Author: Auditvia Engineering
-- Date: 2025-09-30

-- =====================================================
-- PART 1: Ticket Providers Table
-- =====================================================

-- Stores team's integration settings for GitHub/Jira
CREATE TABLE IF NOT EXISTS public.ticket_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('github', 'jira')),
  
  -- Provider-specific configuration
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- GitHub: { "owner": "org-name", "repo": "repo-name", "labels": ["a11y", "bug"] }
  -- Jira: { "host": "company.atlassian.net", "project_key": "PROJ", "issue_type": "Bug" }
  
  -- Encrypted credentials (stored via Supabase Vault in production)
  -- For now, we'll store encrypted tokens directly
  encrypted_token TEXT, -- GitHub PAT or Jira API token
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(team_id, provider_type) -- One provider config per team
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ticket_providers_team_active 
  ON public.ticket_providers(team_id, is_active);

-- =====================================================
-- PART 2: Tickets Table
-- =====================================================

-- Stores created tickets with backlinks
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  issue_rule TEXT NOT NULL, -- e.g., "color-contrast", "link-name"
  provider_id UUID NOT NULL REFERENCES public.ticket_providers(id) ON DELETE RESTRICT,
  
  -- Ticket details
  provider_type TEXT NOT NULL CHECK (provider_type IN ('github', 'jira')),
  ticket_url TEXT NOT NULL, -- Full URL to the created ticket
  ticket_key TEXT NOT NULL, -- GitHub: issue number, Jira: issue key (e.g., "PROJ-123")
  
  -- Snapshot of what was in the ticket
  title TEXT NOT NULL,
  body TEXT, -- Full ticket body (for reference/debugging)
  issue_count INTEGER NOT NULL DEFAULT 0, -- How many instances were in this group
  example_selectors TEXT[], -- Top 3 selectors we included
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'deleted')),
  external_status TEXT, -- Last known status from provider (e.g., "open", "in progress")
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ, -- Last time we checked external status
  
  -- Constraints
  UNIQUE(scan_id, issue_rule, provider_id) -- One ticket per rule per scan per provider
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_tickets_scan 
  ON public.tickets(scan_id, issue_rule);

CREATE INDEX IF NOT EXISTS idx_tickets_team 
  ON public.tickets(team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_provider 
  ON public.tickets(provider_id, status);

-- =====================================================
-- PART 3: RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE public.ticket_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Ticket Providers: Team members can read their team's providers
CREATE POLICY "Team members can view their team's ticket providers"
  ON public.ticket_providers
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Ticket Providers: Team owners/admins can insert/update
CREATE POLICY "Team owners can manage ticket providers"
  ON public.ticket_providers
  FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Tickets: Team members can read their team's tickets
CREATE POLICY "Team members can view their team's tickets"
  ON public.tickets
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Tickets: Team members can insert tickets (creation is allowed)
CREATE POLICY "Team members can create tickets"
  ON public.tickets
  FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Tickets: Team members can update their team's tickets
CREATE POLICY "Team members can update their team's tickets"
  ON public.tickets
  FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.team_members 
      WHERE user_id = auth.uid()
    )
  );

-- Grant service role full access
GRANT ALL ON public.ticket_providers TO service_role;
GRANT ALL ON public.tickets TO service_role;

-- =====================================================
-- PART 4: Helper Functions
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS ticket_providers_updated_at ON public.ticket_providers;
CREATE TRIGGER ticket_providers_updated_at
  BEFORE UPDATE ON public.ticket_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_updated_at();

DROP TRIGGER IF EXISTS tickets_updated_at ON public.tickets;
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_updated_at();

-- =====================================================
-- PART 5: Comments & Documentation
-- =====================================================

COMMENT ON TABLE public.ticket_providers IS 'Stores GitHub/Jira integration settings per team';
COMMENT ON TABLE public.tickets IS 'Stores created tickets with backlinks to scans and external URLs';
COMMENT ON COLUMN public.ticket_providers.config IS 'Provider-specific settings (repo, project, labels, etc.)';
COMMENT ON COLUMN public.ticket_providers.encrypted_token IS 'Encrypted API token (GitHub PAT or Jira token)';
COMMENT ON COLUMN public.tickets.ticket_key IS 'External ticket identifier (GitHub issue # or Jira key)';
COMMENT ON COLUMN public.tickets.example_selectors IS 'Top 3 selectors included in ticket for reference';

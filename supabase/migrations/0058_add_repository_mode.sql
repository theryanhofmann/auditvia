-- Migration: Add repository mode to sites
-- Description: Adds repository_mode enum to distinguish between issue-only and PR modes
-- Date: 2025-09-30

-- Create enum type for repository modes (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'repository_mode') THEN
    CREATE TYPE repository_mode AS ENUM ('issue_only', 'pr');
  END IF;
END $$;

-- Add repository_mode column to sites table
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS repository_mode repository_mode DEFAULT 'issue_only';

-- Add comment for documentation
COMMENT ON COLUMN public.sites.repository_mode IS 'Repository integration mode: issue_only (tracker repo) or pr (code repo with PR capability)';

-- Update existing sites with github_repo to issue_only mode
UPDATE public.sites
SET repository_mode = 'issue_only'
WHERE github_repo IS NOT NULL AND repository_mode IS NULL;

-- Create index for mode-based queries
CREATE INDEX IF NOT EXISTS idx_sites_repository_mode 
ON public.sites(repository_mode) 
WHERE repository_mode IS NOT NULL;

-- Migration: Add GitHub repository field to sites table
-- Description: Adds github_repo column to store owner/repo format for GitHub integration
-- Date: 2025-09-30

-- Add github_repo column to sites table
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS github_repo TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.sites.github_repo IS 'GitHub repository in owner/repo format for issue creation';

-- Create index for sites with GitHub integration enabled
CREATE INDEX IF NOT EXISTS idx_sites_github_repo 
ON public.sites(github_repo) 
WHERE github_repo IS NOT NULL;

-- Grant permissions to authenticated users (via RLS)
-- No additional grants needed - existing RLS policies will apply

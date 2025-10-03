-- Migration: Add GitHub repository field to sites table
-- Run this in Supabase Dashboard → SQL Editor

-- Add github_repo column to sites table
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS github_repo TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.sites.github_repo IS 'GitHub repository in owner/repo format for issue creation';

-- Create index for sites with GitHub integration enabled
CREATE INDEX IF NOT EXISTS idx_sites_github_repo 
ON public.sites(github_repo) 
WHERE github_repo IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sites' 
AND column_name = 'github_repo';

-- Should return:
-- column_name  | data_type | is_nullable
-- github_repo  | text      | YES

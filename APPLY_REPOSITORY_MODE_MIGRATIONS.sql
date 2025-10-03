-- ============================================================================
-- AUDITVIA: REPOSITORY MODE FEATURE MIGRATIONS
-- ============================================================================
-- Description: Adds GitHub repository integration with dual modes
--              (Issue-Only and PR Mode) to the sites table
-- 
-- Migrations Included:
--   - 0057: Add github_repo column
--   - 0058: Add repository_mode enum and column
--
-- Instructions:
--   1. Run this script in Supabase Dashboard → SQL Editor
--   2. After successful execution, reload PostgREST schema cache:
--      Settings → API → "Reload schema cache"
--   3. Verify by querying: SELECT * FROM sites LIMIT 1;
--
-- Rollback:
--   See bottom of file for rollback statements (use with caution)
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Add github_repo column
-- ============================================================================

-- Add github_repo column to sites table
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS github_repo TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.sites.github_repo IS 'GitHub repository in owner/repo format for issue creation';

-- Create index for sites with GitHub integration enabled
CREATE INDEX IF NOT EXISTS idx_sites_github_repo 
ON public.sites(github_repo) 
WHERE github_repo IS NOT NULL;

-- ============================================================================
-- MIGRATION 2: Add repository_mode enum and column
-- ============================================================================

-- Create enum type for repository modes
DO $$ BEGIN
  CREATE TYPE repository_mode AS ENUM ('issue_only', 'pr');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add repository_mode column to sites table
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS repository_mode repository_mode DEFAULT 'issue_only';

-- Add comment for documentation
COMMENT ON COLUMN public.sites.repository_mode IS 'Repository integration mode: issue_only (tracker repo) or pr (code repo with PR capability)';

-- Update existing sites with github_repo to issue_only mode (idempotent)
UPDATE public.sites
SET repository_mode = 'issue_only'
WHERE github_repo IS NOT NULL 
  AND repository_mode IS NULL;

-- Create index for mode-based queries
CREATE INDEX IF NOT EXISTS idx_sites_repository_mode 
ON public.sites(repository_mode) 
WHERE repository_mode IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'sites' 
  AND column_name IN ('github_repo', 'repository_mode')
ORDER BY column_name;

-- Verify enum values
SELECT 
  enumlabel 
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'repository_mode'
ORDER BY enumsortorder;

-- Verify indexes were created
SELECT 
  indexname, 
  indexdef
FROM pg_indexes
WHERE tablename = 'sites'
  AND indexname IN ('idx_sites_github_repo', 'idx_sites_repository_mode');

-- Sample data (should show new columns)
SELECT 
  id,
  name,
  github_repo,
  repository_mode,
  created_at
FROM public.sites
LIMIT 5;

-- ============================================================================
-- SUCCESS INDICATORS
-- ============================================================================
-- If all queries above return results without errors, migration succeeded!
--
-- Expected results:
--   1. Column verification: 2 rows (github_repo, repository_mode)
--   2. Enum verification: 2 rows (issue_only, pr)
--   3. Index verification: 2 rows (both indexes)
--   4. Sample data: Shows sites with new columns (may be NULL for github_repo)
-- ============================================================================

-- ============================================================================
-- ROLLBACK (⚠️ USE WITH EXTREME CAUTION ⚠️)
-- ============================================================================
-- Uncomment ONLY if you need to completely remove this feature
-- WARNING: This will delete all repository configuration data!
-- 
-- -- Drop indexes
-- DROP INDEX IF EXISTS public.idx_sites_repository_mode;
-- DROP INDEX IF EXISTS public.idx_sites_github_repo;
-- 
-- -- Remove columns
-- ALTER TABLE public.sites DROP COLUMN IF EXISTS repository_mode;
-- ALTER TABLE public.sites DROP COLUMN IF EXISTS github_repo;
-- 
-- -- Remove enum type (only after column is dropped)
-- DROP TYPE IF EXISTS repository_mode;
-- ============================================================================

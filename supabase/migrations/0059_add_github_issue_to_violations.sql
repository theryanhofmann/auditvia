-- Add GitHub issue tracking to individual violations
-- This allows us to link specific violations to GitHub issues and prevent duplicates

-- Add columns to track GitHub issues for individual violations
ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS github_issue_url TEXT,
ADD COLUMN IF NOT EXISTS github_issue_number INTEGER,
ADD COLUMN IF NOT EXISTS github_issue_created_at TIMESTAMPTZ;

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_issues_github_issue 
  ON public.issues(github_issue_url) 
  WHERE github_issue_url IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN public.issues.github_issue_url IS 'Full URL to the GitHub issue created for this specific violation';
COMMENT ON COLUMN public.issues.github_issue_number IS 'GitHub issue number (extracted from URL for easy reference)';
COMMENT ON COLUMN public.issues.github_issue_created_at IS 'When the GitHub issue was created from Auditvia';

ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS github_repo TEXT;

CREATE INDEX IF NOT EXISTS idx_sites_github_repo ON public.sites(github_repo) WHERE github_repo IS NOT NULL;

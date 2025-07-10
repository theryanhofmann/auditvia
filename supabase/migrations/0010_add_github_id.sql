-- Add github_id column to sites table
ALTER TABLE sites ADD COLUMN github_id TEXT;

-- Create index for github_id for better query performance
CREATE INDEX idx_sites_github_id ON sites(github_id);

-- Add comment to explain the purpose
COMMENT ON COLUMN sites.github_id IS 'GitHub user ID from OAuth authentication. Used to link sites to GitHub accounts.';

-- Make user_id nullable since we'll be using github_id for new sites
ALTER TABLE sites ALTER COLUMN user_id DROP NOT NULL; 
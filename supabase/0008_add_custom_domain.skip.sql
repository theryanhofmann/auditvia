-- Add custom_domain column to sites table
ALTER TABLE sites ADD COLUMN custom_domain TEXT;

-- Create index for custom_domain for better query performance
CREATE INDEX idx_sites_custom_domain ON sites(custom_domain);

-- Add comment to explain the purpose
COMMENT ON COLUMN sites.custom_domain IS 'Optional custom domain for the site (e.g., app.example.com). If set, this domain will be used for scans instead of the original URL domain.'; 
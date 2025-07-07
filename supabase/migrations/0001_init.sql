-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sites table: stores website URLs that users want to audit
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scans table: stores individual audit runs for each site
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues table: stores individual accessibility issues found during scans
CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    rule TEXT NOT NULL,
    selector TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'serious', 'moderate', 'minor')),
    impact TEXT CHECK (impact IN ('critical', 'serious', 'moderate', 'minor')),
    description TEXT,
    help_url TEXT,
    html TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sites_user_id ON sites(user_id);
CREATE INDEX idx_sites_url ON sites(url);
CREATE INDEX idx_scans_site_id ON scans(site_id);
CREATE INDEX idx_scans_started_at ON scans(started_at);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_issues_scan_id ON issues(scan_id);
CREATE INDEX idx_issues_severity ON issues(severity);
CREATE INDEX idx_issues_rule ON issues(rule);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sites table
-- Users can only see/modify their own sites
CREATE POLICY "Users can view their own sites" ON sites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sites" ON sites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sites" ON sites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sites" ON sites
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for scans table
-- Users can only see scans for their own sites
CREATE POLICY "Users can view scans for their own sites" ON scans
    FOR SELECT USING (
        site_id IN (
            SELECT id FROM sites WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert scans for their own sites" ON scans
    FOR INSERT WITH CHECK (
        site_id IN (
            SELECT id FROM sites WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update scans for their own sites" ON scans
    FOR UPDATE USING (
        site_id IN (
            SELECT id FROM sites WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete scans for their own sites" ON scans
    FOR DELETE USING (
        site_id IN (
            SELECT id FROM sites WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for issues table
-- Users can only see issues for scans of their own sites
CREATE POLICY "Users can view issues for their own scans" ON issues
    FOR SELECT USING (
        scan_id IN (
            SELECT s.id FROM scans s
            JOIN sites st ON s.site_id = st.id
            WHERE st.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert issues for their own scans" ON issues
    FOR INSERT WITH CHECK (
        scan_id IN (
            SELECT s.id FROM scans s
            JOIN sites st ON s.site_id = st.id
            WHERE st.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update issues for their own scans" ON issues
    FOR UPDATE USING (
        scan_id IN (
            SELECT s.id FROM scans s
            JOIN sites st ON s.site_id = st.id
            WHERE st.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete issues for their own scans" ON issues
    FOR DELETE USING (
        scan_id IN (
            SELECT s.id FROM scans s
            JOIN sites st ON s.site_id = st.id
            WHERE st.user_id = auth.uid()
        )
    );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on sites table
CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for getting scan summaries with site information
CREATE VIEW scan_summaries AS
SELECT 
    s.id as scan_id,
    s.score,
    s.started_at,
    s.finished_at,
    s.status,
    st.id as site_id,
    st.url,
    st.name as site_name,
    st.user_id,
    COUNT(i.id) as total_issues,
    COUNT(CASE WHEN i.severity = 'critical' THEN 1 END) as critical_issues,
    COUNT(CASE WHEN i.severity = 'serious' THEN 1 END) as serious_issues,
    COUNT(CASE WHEN i.severity = 'moderate' THEN 1 END) as moderate_issues,
    COUNT(CASE WHEN i.severity = 'minor' THEN 1 END) as minor_issues
FROM scans s
JOIN sites st ON s.site_id = st.id
LEFT JOIN issues i ON s.id = i.scan_id
GROUP BY s.id, st.id;

-- Enable RLS on the view
ALTER VIEW scan_summaries SET (security_invoker = true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON sites TO authenticated;
GRANT ALL ON scans TO authenticated;
GRANT ALL ON issues TO authenticated;
GRANT SELECT ON scan_summaries TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE issues_id_seq TO authenticated; 
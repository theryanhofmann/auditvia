-- Add team_id column and foreign key
ALTER TABLE sites
ADD COLUMN team_id UUID REFERENCES teams(id);

-- Create index for performance
CREATE INDEX idx_sites_team_id ON sites(team_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own sites" ON sites;
DROP POLICY IF EXISTS "Users can update their own sites" ON sites;
DROP POLICY IF EXISTS "Users can delete their own sites" ON sites;

-- Team-based RLS policies
CREATE POLICY "Team members can view team sites"
ON sites FOR SELECT
USING (
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can insert sites"
ON sites FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can update team sites"
ON sites FOR UPDATE
USING (
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Team members can delete team sites"
ON sites FOR DELETE
USING (
  team_id IN (
    SELECT team_id 
    FROM team_members 
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Backfill team_id for existing sites
-- This assumes each user is part of at least one team
-- and we'll use their first team as the default
WITH user_teams AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    team_id
  FROM team_members
  ORDER BY user_id, created_at
)
UPDATE sites s
SET team_id = ut.team_id
FROM user_teams ut
WHERE s.user_id = ut.user_id
AND s.team_id IS NULL;

-- Make team_id required
ALTER TABLE sites
ALTER COLUMN team_id SET NOT NULL; 
-- Drop existing RLS policies for scans table
DROP POLICY IF EXISTS "Users can view scans for their own sites" ON scans;
DROP POLICY IF EXISTS "Users can insert scans for their own sites" ON scans;
DROP POLICY IF EXISTS "Users can update scans for their own sites" ON scans;
DROP POLICY IF EXISTS "Users can delete scans for their own sites" ON scans;
DROP POLICY IF EXISTS "Users can view their own scans" ON scans;
DROP POLICY IF EXISTS "Users can create scans for their sites" ON scans;
DROP POLICY IF EXISTS "Users can update their own scans" ON scans;

-- Add user_id column to scans table
ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing scans with user_id from sites table
UPDATE scans s
SET user_id = sites.user_id
FROM sites
WHERE s.site_id = sites.id;

-- Make user_id NOT NULL after backfilling
ALTER TABLE scans ALTER COLUMN user_id SET NOT NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);

-- Create RLS policies for scans table
CREATE POLICY "Users can view their own scans" ON scans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scans" ON scans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scans" ON scans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans" ON scans
    FOR DELETE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON COLUMN scans.user_id IS 'The user who owns this scan. Used for RLS policies.'; 
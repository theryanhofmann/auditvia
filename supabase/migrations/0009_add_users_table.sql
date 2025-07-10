-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean up any existing data that might cause conflicts
DROP TABLE IF EXISTS users CASCADE;

-- Create users table to map GitHub IDs to Supabase UUIDs
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    github_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for github_id to prevent duplicates
CREATE UNIQUE INDEX users_github_id_unique ON users(github_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows the service role to do everything
CREATE POLICY "Service role can do everything" ON users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Update sites table to reference users table
ALTER TABLE sites
    DROP CONSTRAINT IF EXISTS sites_user_id_fkey;

-- Clean up any orphaned sites
DELETE FROM sites WHERE user_id NOT IN (SELECT id FROM users);

-- Add the foreign key constraint back
ALTER TABLE sites
    ADD CONSTRAINT sites_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Grant necessary permissions
GRANT ALL ON users TO postgres, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role; 
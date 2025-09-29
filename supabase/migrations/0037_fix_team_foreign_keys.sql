-- Fix foreign key references to use the app's users table instead of auth.users

-- Drop existing triggers and functions that use wrong FK references
DROP TRIGGER IF EXISTS on_team_created ON teams;
DROP FUNCTION IF EXISTS handle_new_team();

-- Drop existing foreign key constraints
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_created_by_fkey;
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

-- Update foreign key constraints to reference the app's users table
ALTER TABLE teams 
ADD CONSTRAINT teams_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE team_members 
ADD CONSTRAINT team_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Recreate the trigger function with correct references
CREATE OR REPLACE FUNCTION handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_team_created
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_team();

-- Update RLS policies to use the app's users table pattern
-- Note: Since we're using service role for onboarding, these policies
-- primarily affect client-side operations, but we keep them consistent

-- Update helper functions to work with the correct user context
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  -- Return the user's ID from the app's users table based on auth.uid()
  RETURN (
    SELECT id FROM users 
    WHERE auth.uid() IS NOT NULL 
    AND EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid())
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_team_member function to use app's users table
CREATE OR REPLACE FUNCTION is_team_member(team_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = $1
    AND team_members.user_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_team_admin function to use app's users table  
CREATE OR REPLACE FUNCTION is_team_admin(team_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = $1
    AND team_members.user_id = $2
    AND team_members.role IN ('admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

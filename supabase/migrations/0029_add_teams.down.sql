-- Drop triggers
DROP TRIGGER IF EXISTS on_team_created ON teams;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_team();
DROP FUNCTION IF EXISTS is_team_member(UUID, UUID);
DROP FUNCTION IF EXISTS is_team_admin(UUID, UUID);

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS team_invites;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;

-- Drop enum types
DROP TYPE IF EXISTS team_role;
DROP TYPE IF EXISTS invite_status; 
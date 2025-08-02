-- Create team role enum type
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');

-- Create invite status enum type
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'revoked');

-- Create teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT teams_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 50)
);

-- Create team_members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create team_invites table
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role team_role NOT NULL CHECK (role != 'owner'),
  status invite_status NOT NULL DEFAULT 'pending',
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  CONSTRAINT team_invites_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is a team member
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

-- Helper function to check if user is a team admin/owner
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

-- Teams table policies
CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Team owners/admins can update team details"
  ON teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners can delete teams"
  ON teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'owner'
    )
  );

-- Team members table policies
CREATE POLICY "Team members can view other team members"
  ON team_members FOR SELECT
  USING (is_team_member(team_id, auth.uid()));

CREATE POLICY "Team owners/admins can add members"
  ON team_members FOR INSERT
  WITH CHECK (is_team_admin(team_id, auth.uid()));

CREATE POLICY "Team owners/admins can update member roles"
  ON team_members FOR UPDATE
  USING (is_team_admin(team_id, auth.uid()))
  WITH CHECK (
    -- Prevent changing owner role
    NOT EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = team_members.id
      AND team_members.role = 'owner'
    )
  );

CREATE POLICY "Team owners can remove members"
  ON team_members FOR DELETE
  USING (
    is_team_admin(team_id, auth.uid()) AND
    -- Prevent removing the owner
    NOT EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = team_members.id
      AND team_members.role = 'owner'
    )
  );

-- Team invites table policies
CREATE POLICY "Team members can view invites"
  ON team_invites FOR SELECT
  USING (is_team_member(team_id, auth.uid()));

CREATE POLICY "Team owners/admins can create invites"
  ON team_invites FOR INSERT
  WITH CHECK (is_team_admin(team_id, auth.uid()));

CREATE POLICY "Team owners/admins can update invite status"
  ON team_invites FOR UPDATE
  USING (is_team_admin(team_id, auth.uid()));

-- Create indexes for performance
CREATE INDEX team_members_team_id_idx ON team_members(team_id);
CREATE INDEX team_members_user_id_idx ON team_members(user_id);
CREATE INDEX team_invites_team_id_idx ON team_invites(team_id);
CREATE INDEX team_invites_email_idx ON team_invites(email);
CREATE INDEX team_invites_token_idx ON team_invites(token);

-- Add function to automatically add team creator as owner
CREATE OR REPLACE FUNCTION handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_team_created
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_team(); 
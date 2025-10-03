-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id),
  target_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS audit_logs_team_id_idx ON audit_logs(team_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_target_user_id_idx ON audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Team members can view audit logs for their team
CREATE POLICY "Team members can view team audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE audit_logs IS 'Stores team activity audit trail';
COMMENT ON COLUMN audit_logs.action IS 'Action type: invite_sent, invite_accepted, invite_revoked, role_changed, member_removed, etc.';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context: old_role, new_role, reason, etc.';

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT ALL ON audit_logs TO service_role;


-- Create AI suggestions log table
CREATE TABLE ai_suggestions_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) NOT NULL,
  url text NOT NULL,
  violation_count integer NOT NULL,
  suggestions jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies
ALTER TABLE ai_suggestions_log ENABLE ROW LEVEL SECURITY;

-- Users can only read their own logs
CREATE POLICY "Users can read their own logs"
  ON ai_suggestions_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own logs
CREATE POLICY "Users can insert their own logs"
  ON ai_suggestions_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster user lookups
CREATE INDEX ai_suggestions_log_user_id_idx ON ai_suggestions_log(user_id); 
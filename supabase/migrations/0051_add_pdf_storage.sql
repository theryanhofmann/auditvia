-- Create storage bucket for PDF reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-reports',
  'pdf-reports', 
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for PDF reports bucket
CREATE POLICY "Team members can upload PDF reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdf-reports' AND
  (storage.foldername(name))[1] IN (
    SELECT team_id::text FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can view their PDF reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pdf-reports' AND
  (storage.foldername(name))[1] IN (
    SELECT team_id::text FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Team members can delete their PDF reports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pdf-reports' AND
  (storage.foldername(name))[1] IN (
    SELECT team_id::text FROM team_members 
    WHERE user_id = auth.uid()
  )
);

-- Create table to track PDF generation jobs
CREATE TABLE IF NOT EXISTS pdf_generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_path TEXT,
  download_url TEXT,
  file_size INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS pdf_jobs_scan_id_idx ON pdf_generation_jobs(scan_id);
CREATE INDEX IF NOT EXISTS pdf_jobs_team_id_idx ON pdf_generation_jobs(team_id);
CREATE INDEX IF NOT EXISTS pdf_jobs_user_id_idx ON pdf_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS pdf_jobs_status_idx ON pdf_generation_jobs(status);
CREATE INDEX IF NOT EXISTS pdf_jobs_created_at_idx ON pdf_generation_jobs(created_at DESC);

-- Enable RLS on PDF jobs table
ALTER TABLE pdf_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for PDF generation jobs
CREATE POLICY "Users can view their team's PDF jobs"
ON pdf_generation_jobs FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create PDF jobs for their teams"
ON pdf_generation_jobs FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "System can update PDF jobs"
ON pdf_generation_jobs FOR UPDATE
USING (true); -- Service role can update any job

-- Function to clean up old PDF files (run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_pdf_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete PDF jobs older than 30 days
  DELETE FROM pdf_generation_jobs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Note: Actual file cleanup from storage would need to be handled separately
  -- This could be done via a scheduled function or cron job
END;
$$;

-- Add helpful comments
COMMENT ON TABLE pdf_generation_jobs IS 'Tracks PDF report generation requests and their status';
COMMENT ON COLUMN pdf_generation_jobs.status IS 'Current status of PDF generation: pending, processing, completed, failed';
COMMENT ON COLUMN pdf_generation_jobs.file_path IS 'Path to generated PDF file in Supabase storage';
COMMENT ON COLUMN pdf_generation_jobs.download_url IS 'Signed URL for downloading the PDF (expires after 1 hour)';
COMMENT ON FUNCTION cleanup_old_pdf_reports() IS 'Cleans up PDF generation jobs older than 30 days';

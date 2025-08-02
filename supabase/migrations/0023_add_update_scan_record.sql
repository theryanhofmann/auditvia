-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.update_scan_record;

-- Create or replace the update_scan_record function
CREATE OR REPLACE FUNCTION public.update_scan_record(
  p_scan_id uuid,
  p_total_violations integer,
  p_passes integer,
  p_incomplete integer,
  p_inapplicable integer,
  p_scan_time_ms integer,
  p_status text,
  p_finished_at timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.scans
  SET 
    total_violations = p_total_violations,
    passes = p_passes,
    incomplete = p_incomplete,
    inapplicable = p_inapplicable,
    scan_time_ms = p_scan_time_ms,
    status = p_status,
    finished_at = p_finished_at,
    updated_at = NOW()
  WHERE id = p_scan_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_scan_record TO authenticated;

-- Ensure monitoring column has a default value and backfill nulls
ALTER TABLE public.sites 
  ALTER COLUMN monitoring SET DEFAULT false;

UPDATE public.sites 
SET monitoring = false 
WHERE monitoring IS NULL; 
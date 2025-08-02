-- Add monitoring fields to sites table
ALTER TABLE sites
ADD COLUMN monitoring_enabled BOOLEAN DEFAULT false,
ADD COLUMN monitoring_frequency TEXT DEFAULT 'daily' CHECK (monitoring_frequency IN ('daily', 'weekly', 'monthly')),
ADD COLUMN last_monitored_at TIMESTAMPTZ,
ADD COLUMN next_monitoring_at TIMESTAMPTZ;

-- Function to calculate next monitoring time
CREATE OR REPLACE FUNCTION calculate_next_monitoring_time(
  frequency TEXT,
  last_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE frequency
    WHEN 'daily' THEN last_time + INTERVAL '1 day'
    WHEN 'weekly' THEN last_time + INTERVAL '1 week'
    WHEN 'monthly' THEN last_time + INTERVAL '1 month'
    ELSE last_time + INTERVAL '1 day'
  END;
END;
$$;

-- Function to update monitoring schedule
CREATE OR REPLACE FUNCTION update_monitoring_schedule(site_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE sites
  SET next_monitoring_at = calculate_next_monitoring_time(monitoring_frequency, COALESCE(last_monitored_at, NOW()))
  WHERE id = site_id
  AND monitoring_enabled = true;
END;
$$;

-- Function to get sites due for monitoring
CREATE OR REPLACE FUNCTION get_sites_due_for_monitoring(cutoff_time TIMESTAMPTZ DEFAULT NOW())
RETURNS TABLE (
  id UUID,
  url TEXT,
  team_id UUID,
  monitoring_frequency TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.url, s.team_id, s.monitoring_frequency
  FROM sites s
  WHERE s.monitoring_enabled = true
  AND s.next_monitoring_at <= cutoff_time
  AND has_team_pro_access(s.team_id);
END;
$$;

-- Trigger to automatically update next_monitoring_at
CREATE OR REPLACE FUNCTION update_monitoring_schedule_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.monitoring_enabled = true THEN
    NEW.next_monitoring_at := calculate_next_monitoring_time(NEW.monitoring_frequency, COALESCE(NEW.last_monitored_at, NOW()));
  ELSE
    NEW.next_monitoring_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_site_monitoring_schedule
  BEFORE INSERT OR UPDATE OF monitoring_enabled, monitoring_frequency, last_monitored_at
  ON sites
  FOR EACH ROW
  EXECUTE FUNCTION update_monitoring_schedule_trigger();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_next_monitoring_time TO authenticated;
GRANT EXECUTE ON FUNCTION update_monitoring_schedule TO authenticated;
GRANT EXECUTE ON FUNCTION get_sites_due_for_monitoring TO service_role; 
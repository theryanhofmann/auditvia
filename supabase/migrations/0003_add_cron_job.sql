-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the scheduled monitoring cron job
-- Runs every 6 hours (at 00:00, 06:00, 12:00, 18:00 UTC)
SELECT cron.schedule(
    'scheduled-monitoring',
    '0 */6 * * *',
    $$
    SELECT net.http_post(
        url := (SELECT 'https://' || current_setting('app.settings.project_ref') || '.supabase.co/functions/v1/scheduled-monitoring'),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Alternative approach: Create a function to call the edge function
CREATE OR REPLACE FUNCTION trigger_scheduled_monitoring()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    project_url text;
    service_key text;
    response record;
BEGIN
    -- Get project settings (these would be set via environment variables in production)
    project_url := current_setting('app.settings.project_url', true);
    service_key := current_setting('app.settings.service_role_key', true);
    
    -- If settings are not available, log and exit
    IF project_url IS NULL OR service_key IS NULL THEN
        RAISE LOG 'Scheduled monitoring skipped: missing project_url or service_key settings';
        RETURN;
    END IF;
    
    -- Call the edge function
    SELECT INTO response net.http_post(
        url := project_url || '/functions/v1/scheduled-monitoring',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_key
        ),
        body := '{}'::jsonb
    );
    
    -- Log the result
    RAISE LOG 'Scheduled monitoring triggered: status %, response %', 
        response.status_code, 
        response.content;
        
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Scheduled monitoring error: %', SQLERRM;
END;
$$;

-- Create a simpler cron job that calls our function
SELECT cron.schedule(
    'scheduled-monitoring-function',
    '0 */6 * * *',
    'SELECT trigger_scheduled_monitoring();'
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_scheduled_monitoring() TO postgres;

-- Insert a record to track cron job creation
INSERT INTO monitoring_summary_logs (
    sites_monitored,
    successful_scans,
    failed_scans,
    execution_time_seconds,
    created_at
) VALUES (
    0,
    0,
    0,
    0,
    NOW()
);

-- Add a comment for documentation
COMMENT ON FUNCTION trigger_scheduled_monitoring() IS 'Triggers the scheduled monitoring edge function every 6 hours via cron job'; 
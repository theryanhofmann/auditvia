# Daily Scans Deployment Guide

This guide walks you through deploying the automated daily scans feature for Auditvia.

## Overview

The daily scans feature automatically runs accessibility scans for monitored sites every day at 02:00 UTC using a Supabase Edge Function.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Supabase project set up and linked
- Database access (SQL editor or direct connection)

## Step 1: Database Migration

Run the SQL migration to create the required tables and columns:

```sql
-- Copy and run the contents of scripts/deploy-scan-logs.sql
-- This creates the scan_logs table and adds monitoring column to sites
```

Or run directly:

```bash
# If using Supabase CLI
supabase db reset --linked
# Or apply the migration file to your live database
```

## Step 2: Deploy the Edge Function

1. **Deploy the function:**
   ```bash
   supabase functions deploy daily_scans
   ```

2. **Set required environment variables:**
   ```bash
   # Set your application URL
   supabase secrets set APP_URL=https://your-production-domain.com
   
   # Service role key is automatically available as SUPABASE_SERVICE_ROLE_KEY
   # Supabase URL is automatically available as SUPABASE_URL
   ```

## Step 3: Schedule the Function

The function includes a cron configuration that schedules it to run daily at 02:00 UTC. This is automatically set up when you deploy the function.

If you need to verify the schedule:
```bash
# Check deployed functions
supabase functions list
```

## Step 4: Enable Monitoring for Sites

Enable monitoring for specific sites that should be included in daily scans:

```sql
-- Enable monitoring for specific sites
UPDATE sites 
SET monitoring = true 
WHERE url IN (
    'https://example.com',
    'https://another-site.com'
);

-- Or enable for all sites (be careful!)
-- UPDATE sites SET monitoring = true;

-- Check which sites have monitoring enabled
SELECT id, url, name, monitoring, created_at 
FROM sites 
WHERE monitoring = true;
```

## Step 5: Test the Function

### Manual Test
```bash
# Test the function manually
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily_scans' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

### Check Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions → daily_scans
3. Check the Logs tab for execution history

### Verify Results
```sql
-- Check scan logs
SELECT 
    sl.*,
    s.url,
    s.name
FROM scan_logs sl
JOIN sites s ON sl.site_id = s.id
ORDER BY sl.run_at DESC
LIMIT 10;

-- Check recent scans
SELECT 
    s.url,
    s.name,
    sc.score,
    sc.status,
    sc.created_at
FROM sites s
JOIN scans sc ON s.id = sc.site_id
WHERE s.monitoring = true
ORDER BY sc.created_at DESC
LIMIT 20;
```

## Step 6: Monitor and Maintain

### Regular Monitoring
- Check Edge Function logs weekly
- Review scan_logs for failed scans
- Monitor scan success rates

### Queries for Monitoring
```sql
-- Scan success rate over last 7 days
SELECT 
    DATE(run_at) as scan_date,
    COUNT(*) as total_scans,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_scans,
    ROUND(
        (SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2
    ) as success_rate_percent
FROM scan_logs
WHERE run_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(run_at)
ORDER BY scan_date DESC;

-- Failed scans in last 24 hours
SELECT 
    sl.run_at,
    s.url,
    s.name,
    sl.message
FROM scan_logs sl
JOIN sites s ON sl.site_id = s.id
WHERE sl.success = false 
  AND sl.run_at >= NOW() - INTERVAL '24 hours'
ORDER BY sl.run_at DESC;
```

### Troubleshooting

**Function not running:**
- Check cron configuration in Supabase Dashboard
- Verify function deployment was successful
- Check Edge Function logs for errors

**Scans failing:**
- Verify APP_URL environment variable is correct
- Check if target sites are accessible
- Review error messages in scan_logs table
- Ensure service role key has proper permissions

**No sites being scanned:**
- Verify sites have `monitoring = true`
- Check if sites table has any records
- Review function logs for "No monitored sites" message

## Security Notes

- The function uses service role key authentication
- Only sites with `monitoring = true` are scanned
- All scan attempts are logged for audit purposes
- Function runs with proper CORS headers for security

## Performance Considerations

- Function includes 2-second delays between scans
- Suitable for up to ~100 monitored sites (total runtime ~3-4 minutes)
- For larger numbers of sites, consider:
  - Splitting into multiple functions
  - Implementing queue-based processing
  - Adjusting timeout settings

## Cost Estimation

Supabase Edge Functions pricing (as of 2024):
- 500,000 requests/month included in Pro plan
- Daily function = ~30 requests/month
- Additional scans are very low cost

The daily scans feature is now ready for production use! 
# Scheduled Monitoring Edge Function

This document describes the automated accessibility monitoring system implemented using Supabase Edge Functions and cron jobs.

## Overview

The `scheduled-monitoring` Edge Function performs automated accessibility scans for all sites with `monitoring = true` every 6 hours. It provides comprehensive logging, error handling, and summary reporting.

## Features

### ✅ **Core Functionality**
- **Automated Site Discovery**: Fetches all sites with `monitoring = true`
- **Batch Processing**: Processes each site individually with robust error handling
- **Service Authentication**: Uses internal service role key for API calls
- **Comprehensive Logging**: Logs individual scan results and overall summaries
- **Graceful Degradation**: One site failure doesn't affect others
- **Performance Monitoring**: Tracks execution time and provides detailed metrics

### ✅ **Database Integration**
- **Scan Storage**: Automatically inserts results into `scans` and `issues` tables
- **Monitoring Logs**: Tracks individual scan attempts in `monitoring_logs`
- **Summary Logs**: Records overall job performance in `monitoring_summary_logs`
- **Statistics View**: Provides `monitoring_stats` view for easy reporting

### ✅ **Error Handling**
- **Site-Level Isolation**: Individual site failures don't stop the job
- **Network Resilience**: Handles API timeouts and connection errors
- **Database Fallback**: Continues execution even if logging fails
- **Comprehensive Error Messages**: Detailed error reporting for debugging

## Files Structure

```
supabase/
├── functions/
│   └── scheduled-monitoring/
│       └── index.ts                 # Main edge function
├── migrations/
│   ├── 0002_add_monitoring.sql      # Monitoring tables and columns
│   └── 0003_add_cron_job.sql        # Cron job setup
scripts/
├── deploy-monitoring.sh             # Deployment script
└── test-monitoring.sh               # Local testing script
```

## Database Schema

### Sites Table (Updated)
```sql
ALTER TABLE sites ADD COLUMN monitoring BOOLEAN DEFAULT false;
```

### Monitoring Logs Table
```sql
CREATE TABLE monitoring_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL,
    score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
    violations INTEGER,
    message TEXT NOT NULL,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Monitoring Summary Logs Table
```sql
CREATE TABLE monitoring_summary_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sites_monitored INTEGER NOT NULL DEFAULT 0,
    successful_scans INTEGER NOT NULL DEFAULT 0,
    failed_scans INTEGER NOT NULL DEFAULT 0,
    average_score NUMERIC(5,2),
    total_violations INTEGER,
    execution_time_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Response Format

### Successful Response
```json
{
  "message": "Scheduled monitoring completed",
  "timestamp": "2025-01-07T22:30:00.000Z",
  "total_sites_monitored": 5,
  "total_attempted": 5,
  "total_successful": 4,
  "total_failed": 1,
  "average_score": 87,
  "total_violations": 12,
  "execution_time_seconds": 45,
  "results": [
    {
      "site_id": "uuid",
      "site_url": "https://example.com",
      "site_name": "Example Site",
      "success": true,
      "scan_id": "scan-uuid",
      "score": 92,
      "violations": 3,
      "message": "Scan completed successfully. Score: 92/100, Violations: 3",
      "duration": 8
    }
  ]
}
```

### No Sites Response
```json
{
  "message": "No sites with monitoring enabled found",
  "timestamp": "2025-01-07T22:30:00.000Z",
  "total_sites_monitored": 0,
  "total_attempted": 0,
  "total_successful": 0,
  "total_failed": 0,
  "execution_time_seconds": 2,
  "results": []
}
```

## Deployment

### Prerequisites
1. **Supabase CLI**: Install the Supabase CLI
   ```bash
   npm install -g supabase
   ```

2. **Authentication**: Login to Supabase
   ```bash
   supabase login
   ```

3. **Project Setup**: Link to your Supabase project
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

### Deploy with Script
```bash
./scripts/deploy-monitoring.sh
```

### Manual Deployment
```bash
# Run database migrations
supabase db push

# Deploy the edge function
supabase functions deploy scheduled-monitoring --no-verify-jwt
```

## Local Testing

### Prerequisites
1. **Start Supabase locally**:
   ```bash
   supabase start
   ```

2. **Serve edge functions**:
   ```bash
   supabase functions serve --env-file ./supabase/.env
   ```

### Test with Script
```bash
./scripts/test-monitoring.sh
```

### Manual Testing
```bash
curl -X POST http://localhost:54321/functions/v1/scheduled-monitoring \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Cron Job Configuration

The function runs automatically every 6 hours using pg_cron:

```sql
-- Runs at 00:00, 06:00, 12:00, 18:00 UTC daily
SELECT cron.schedule(
    'scheduled-monitoring-function',
    '0 */6 * * *',
    'SELECT trigger_scheduled_monitoring();'
);
```

### View Cron Jobs
```sql
SELECT * FROM cron.job;
```

### View Cron Job History
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Monitoring and Debugging

### Check Recent Monitoring Runs
```sql
SELECT 
    sites_monitored,
    successful_scans,
    failed_scans,
    average_score,
    total_violations,
    execution_time_seconds,
    created_at
FROM monitoring_summary_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### View Individual Scan Logs
```sql
SELECT 
    ml.*,
    s.url,
    s.name
FROM monitoring_logs ml
JOIN sites s ON ml.site_id = s.id
ORDER BY ml.created_at DESC 
LIMIT 20;
```

### Monitor Site Performance
```sql
SELECT * FROM monitoring_stats;
```

### Check Failed Scans
```sql
SELECT 
    s.url,
    s.name,
    ml.message,
    ml.error,
    ml.created_at
FROM monitoring_logs ml
JOIN sites s ON ml.site_id = s.id
WHERE ml.success = false
ORDER BY ml.created_at DESC;
```

## Environment Variables

### Required for Production
```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_URL=https://your-domain.com
```

### Local Development
```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
APP_URL=http://localhost:3000
```

## Performance Considerations

- **Rate Limiting**: 1-second delay between site scans to avoid overwhelming the system
- **Timeout Handling**: Each site scan has individual timeout protection
- **Memory Efficiency**: Processes sites sequentially rather than in parallel
- **Database Optimization**: Indexed queries for fast site retrieval
- **Logging Efficiency**: Batch inserts where possible

## Security Features

- **Service Role Authentication**: Uses Supabase service role for internal API calls
- **Row Level Security**: All monitoring tables respect RLS policies
- **User Isolation**: Users can only see monitoring logs for their own sites
- **Error Sanitization**: Sensitive information is not exposed in error messages

## Troubleshooting

### Common Issues

1. **Function Not Running**
   - Check cron job status: `SELECT * FROM cron.job WHERE jobname = 'scheduled-monitoring-function';`
   - Verify function deployment: Check Supabase dashboard

2. **Sites Not Being Scanned**
   - Verify monitoring is enabled: `SELECT * FROM sites WHERE monitoring = true;`
   - Check API endpoint availability
   - Review function logs in Supabase dashboard

3. **Authentication Errors**
   - Verify service role key is correct
   - Check APP_URL environment variable
   - Ensure x-service-key authentication is working

### Debug Commands

```sql
-- Check if monitoring is enabled for any sites
SELECT COUNT(*) FROM sites WHERE monitoring = true;

-- View recent function executions
SELECT * FROM monitoring_summary_logs ORDER BY created_at DESC LIMIT 5;

-- Check for errors in monitoring logs
SELECT * FROM monitoring_logs WHERE success = false ORDER BY created_at DESC LIMIT 10;
```

## Next Steps

1. **Monitor Function Performance**: Check logs regularly for any issues
2. **Adjust Frequency**: Modify cron schedule if needed
3. **Add Alerting**: Set up notifications for failed monitoring runs
4. **Scale Considerations**: Monitor execution time as site count grows
5. **Email Integration**: Consider adding email notifications for monitoring summaries

## Support

For issues or questions:
1. Check the Supabase dashboard function logs
2. Review the monitoring_logs table for detailed error information
3. Test the function manually using the provided scripts
4. Verify all environment variables are correctly set 
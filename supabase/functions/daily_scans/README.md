# Daily Scans Edge Function

This Supabase Edge Function automatically runs accessibility scans for all sites with monitoring enabled.

## Features

- **Scheduled Execution**: Runs daily at 02:00 UTC via cron job (`0 2 * * *`)
- **Site Monitoring**: Only scans sites where `monitoring = true`
- **Service Authentication**: Uses service role key for authenticated API calls
- **Comprehensive Logging**: Records success/failure of each scan in `scan_logs` table
- **Error Handling**: Gracefully handles failures and continues processing other sites
- **Rate Limiting**: 2-second delay between scans to avoid overwhelming the system

## Database Tables

### scan_logs
- `id` (serial): Primary key
- `site_id` (uuid): Foreign key to sites table
- `run_at` (timestamptz): When the scan was attempted (default: now())
- `success` (boolean): Whether the scan succeeded
- `message` (text): Success/error message with details
- `created_at` (timestamptz): Log entry creation time

### sites (updated)
- Added `monitoring` (boolean): Enable/disable automated scanning for this site

## Environment Variables

The function requires these environment variables in Supabase:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `APP_URL`: Your application URL (e.g., `https://your-app.com`)

## Deployment

1. **Deploy the function:**
   ```bash
   supabase functions deploy daily_scans
   ```

2. **Set environment variables:**
   ```bash
   supabase secrets set APP_URL=https://your-app.com
   ```

3. **Run the database migration:**
   ```sql
   -- Run the SQL in scripts/deploy-scan-logs.sql
   ```

4. **Enable monitoring for sites:**
   ```sql
   UPDATE sites SET monitoring = true WHERE id = 'your-site-id';
   ```

## Manual Testing

You can manually trigger the function for testing:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/daily_scans' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

## Monitoring

- Check function logs in Supabase Dashboard → Edge Functions → daily_scans
- Query `scan_logs` table to see scan history:
  ```sql
  SELECT sl.*, s.url, s.name 
  FROM scan_logs sl 
  JOIN sites s ON sl.site_id = s.id 
  ORDER BY sl.run_at DESC 
  LIMIT 20;
  ```

## Function Flow

1. Verify authentication
2. Fetch all sites with `monitoring = true`
3. For each site:
   - Call `/api/audit` with service key header
   - Parse response and create scan log entry
   - Wait 2 seconds before next scan
4. Bulk insert all scan logs
5. Return summary of results

## Error Handling

- Network errors: Logged as failures, processing continues
- API errors: Logged with error message, processing continues
- Database errors: Function continues but logs error
- Complete failure: Returns 500 with error details 
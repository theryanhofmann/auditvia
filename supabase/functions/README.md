# Supabase Edge Functions

This directory contains Supabase Edge Functions for Auditvia.

## runScheduledScans

Automated accessibility scanning function that runs every 12 hours to scan all sites with monitoring enabled.

### Features

- ⏰ **Scheduled Execution**: Runs every 12 hours (6 AM and 6 PM UTC)
- 🎯 **Smart Domain Selection**: Uses custom domain if set, falls back to original URL
- 📊 **Comprehensive Logging**: Tracks success/failure in `scheduled_scan_logs` table
- 🔒 **Error Handling**: Graceful error handling with detailed logging
- 📈 **Performance Tracking**: Execution time monitoring for each scan

### Database Dependencies

The function requires these database tables:
- `sites` - Site configurations with monitoring flags
- `scans` - Scan results storage
- `scheduled_scan_logs` - Execution logs (created by migration 0004)

### Deployment

1. **Deploy the function:**
   ```bash
   supabase functions deploy runScheduledScans
   ```

2. **Set up the cron schedule:**
   ```bash
   supabase functions deploy runScheduledScans --schedule="0 6,18 * * *"
   ```

3. **Verify deployment:**
   ```bash
   supabase functions list
   ```

### Configuration

The function is configured to run every 12 hours. You can modify the schedule in `config.toml`:

```toml
[runScheduledScans]
schedule = "0 6,18 * * *"  # 6 AM and 6 PM UTC
```

#### Alternative Schedules

- Every 6 hours: `"0 */6 * * *"`
- Daily at 6 AM UTC: `"0 6 * * *"`
- Weekdays at 9 AM UTC: `"0 9 * * 1-5"`

### Testing

Run the test script to simulate scheduled scans:

```bash
# Simulation mode (shows what would be scanned)
npm run test:scheduled-scans

# Run actual scans (consumes quota)
npm run test:scheduled-scans -- --run-scans
```

### Manual Execution

You can manually trigger the function for testing:

```bash
curl -X POST "https://your-project.supabase.co/functions/v1/runScheduledScans" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Monitoring

- **Logs**: View function logs in Supabase Dashboard > Edge Functions
- **Database**: Check `scheduled_scan_logs` table for execution history
- **Performance**: Monitor execution times and success rates

### Environment Variables

Required environment variables (automatically available in Supabase):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

### Future Enhancements

The function includes TODO comments for future features:
- Email notifications for failed scans or low scores
- Dashboard notifications for new scan results  
- Integration with alerting system for critical issues

### Troubleshooting

**Function not running on schedule:**
- Check the cron configuration in `config.toml`
- Verify the function is deployed with the schedule flag
- Check Supabase Dashboard for function errors

**No sites being scanned:**
- Ensure sites have `monitoring = true` in the database
- Check that sites exist with valid URLs
- Verify custom domains are properly formatted

**Scan failures:**
- Check `scheduled_scan_logs` table for error messages
- Verify the audit API is functioning
- Check network connectivity and URL accessibility 
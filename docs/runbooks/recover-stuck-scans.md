# Runbook: Recovering Stuck Scans

## Overview

This runbook provides procedures for identifying, diagnosing, and recovering scans that are stuck in a "running" state. The scan lifecycle hardening system includes automated cleanup, but manual intervention may sometimes be required.

## Quick Reference

### Emergency Commands

```bash
# Check for stuck scans
curl -X GET "/api/admin/cleanup-scans" -H "Authorization: Bearer $ADMIN_TOKEN"

# Clean up stuck scans (dry run first)
curl -X POST "/api/admin/cleanup-scans" -H "Content-Type: application/json" \
  -d '{"dryRun": true, "maxRuntimeMinutes": 15, "heartbeatStaleMinutes": 5}'

# Actually clean up stuck scans
curl -X POST "/api/admin/cleanup-scans" -H "Content-Type: application/json" \
  -d '{"dryRun": false, "maxRuntimeMinutes": 15, "heartbeatStaleMinutes": 5}'

# Mark specific scan as failed
curl -X PUT "/api/admin/cleanup-scans/$SCAN_ID" -H "Content-Type: application/json" \
  -d '{"reason": "Manual intervention - scan appeared stuck"}'
```

## Identification

### 1. Automated Detection

The system automatically detects stuck scans based on:
- **Runtime timeout**: Scans running longer than `max_runtime_minutes` (default: 15 minutes)
- **Heartbeat staleness**: No `last_activity_at` update for 3x the `heartbeat_interval_seconds` (default: 90 seconds)

### 2. Manual Detection

#### Database Query
```sql
-- Find potentially stuck scans
SELECT 
  id,
  status,
  created_at,
  last_activity_at,
  progress_message,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as runtime_minutes,
  EXTRACT(EPOCH FROM (NOW() - last_activity_at))/60 as heartbeat_age_minutes,
  max_runtime_minutes,
  heartbeat_interval_seconds
FROM scans 
WHERE status = 'running' 
  AND (
    created_at < NOW() - INTERVAL '15 minutes' OR
    last_activity_at < NOW() - INTERVAL '5 minutes'
  )
ORDER BY created_at DESC;
```

#### Health Check API
```bash
curl -X GET "/api/admin/cleanup-scans" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

Expected response:
```json
{
  "success": true,
  "healthMetrics": {
    "totalScans": 150,
    "runningScans": 2,
    "staleScans": 1,
    "timeoutScans": 0,
    "healthScore": 85
  },
  "stuckScans": [
    {
      "scanId": "uuid-here",
      "reason": "heartbeat_stale",
      "ageMinutes": 12,
      "heartbeatAgeMinutes": 8
    }
  ],
  "recommendations": [
    "1 scans have stale heartbeats. Check scan execution environment."
  ]
}
```

### 3. User Reports

Users may report:
- Infinite "Scanning in progress..." spinner
- Scans that never complete
- Dashboard showing scans as "running" for extended periods

## Diagnosis

### 1. Check Scan Lifecycle Events

```sql
-- Get scan lifecycle history
SELECT 
  event_type,
  event_data,
  created_at
FROM scan_lifecycle_events 
WHERE scan_id = '$SCAN_ID' 
ORDER BY created_at DESC;
```

### 2. Check System Health

```bash
# Check if Playwright browsers are available
npx playwright install --dry-run

# Check PostgREST schema cache
curl -X POST "$SUPABASE_URL/rest/v1/" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY"

# Check database connectivity
psql "$DATABASE_URL" -c "SELECT NOW();"
```

### 3. Check Application Logs

Look for patterns in logs:
```bash
# Schema cache errors
grep -i "PGRST204\|schema cache" /var/log/app.log

# Playwright errors
grep -i "playwright\|browser" /var/log/app.log

# Heartbeat failures
grep -i "heartbeat.*failed" /var/log/app.log

# Recovery attempts
grep -i "schema.*recovery" /var/log/app.log
```

## Recovery Procedures

### 1. Automated Cleanup (Recommended)

#### Step 1: Health Check
```bash
curl -X GET "/api/admin/cleanup-scans" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### Step 2: Dry Run Cleanup
```bash
curl -X POST "/api/admin/cleanup-scans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "dryRun": true,
    "maxRuntimeMinutes": 15,
    "heartbeatStaleMinutes": 5
  }'
```

#### Step 3: Execute Cleanup
```bash
curl -X POST "/api/admin/cleanup-scans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "dryRun": false,
    "maxRuntimeMinutes": 15,
    "heartbeatStaleMinutes": 5
  }'
```

### 2. Manual Database Cleanup

#### For Specific Scans
```sql
-- Mark specific scan as failed
UPDATE scans 
SET 
  status = 'failed',
  ended_at = NOW(),
  error_message = 'Manually marked as failed - scan appeared stuck',
  cleanup_reason = 'manual_intervention',
  updated_at = NOW()
WHERE id = '$SCAN_ID' AND status = 'running';
```

#### Bulk Cleanup
```sql
-- Use the database function
SELECT cleanup_stuck_scans_v2(15, 5, false);
```

### 3. Schema Cache Recovery

If scans are failing due to schema cache issues:

#### Supabase Cloud
1. Go to Supabase Dashboard → Settings → API
2. Click "Restart PostgREST"
3. Wait 30 seconds for restart to complete

#### Self-Hosted PostgREST
```bash
# Restart PostgREST service
systemctl restart postgrest

# Or trigger schema reload
curl -X POST "http://localhost:3000/"
```

#### Local Development
```bash
supabase stop
supabase start
```

### 4. Environment-Specific Recovery

#### Development
```bash
# Shorter timeouts for faster feedback
curl -X POST "/api/admin/cleanup-scans" \
  -d '{"dryRun": false, "maxRuntimeMinutes": 5, "heartbeatStaleMinutes": 2}'
```

#### Staging
```bash
# Moderate timeouts
curl -X POST "/api/admin/cleanup-scans" \
  -d '{"dryRun": false, "maxRuntimeMinutes": 10, "heartbeatStaleMinutes": 3}'
```

#### Production
```bash
# Conservative timeouts
curl -X POST "/api/admin/cleanup-scans" \
  -d '{"dryRun": false, "maxRuntimeMinutes": 15, "heartbeatStaleMinutes": 5}'
```

## Post-Recovery Verification

### 1. Verify Cleanup Success
```sql
-- Should return 0 or very few results
SELECT COUNT(*) FROM scans 
WHERE status = 'running' 
  AND created_at < NOW() - INTERVAL '15 minutes';
```

### 2. Test New Scan
```bash
# Start a test scan to verify system health
curl -X POST "/api/audit" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "siteId": "$TEST_SITE_ID"}'
```

### 3. Monitor Health Metrics
```bash
# Check system health after cleanup
curl -X GET "/api/admin/cleanup-scans" | jq '.healthMetrics'
```

## Prevention

### 1. Monitoring Setup

#### Database Alerts
```sql
-- Create view for monitoring
CREATE VIEW stuck_scans_monitor AS
SELECT 
  COUNT(*) as stuck_count,
  MAX(EXTRACT(EPOCH FROM (NOW() - created_at))/60) as oldest_runtime_minutes
FROM scans 
WHERE status = 'running' 
  AND created_at < NOW() - INTERVAL '15 minutes';
```

#### Application Metrics
- Monitor `scan_failed` events with `reason: 'cleanup_stuck_scans'`
- Track average scan completion time
- Alert on health score < 80%

### 2. Automated Cleanup Schedule

#### Cron Job (recommended)
```bash
# Add to crontab - run every 15 minutes
*/15 * * * * curl -X POST "https://your-app.com/api/admin/cleanup-scans" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"dryRun": false}' >> /var/log/scan-cleanup.log 2>&1
```

#### Supabase Edge Function
```typescript
// Deploy as scheduled function
import { scanMaintenanceManager } from './scan-maintenance.ts'

Deno.serve(async (req) => {
  const result = await scanMaintenanceManager.runMaintenanceCycle(false)
  return new Response(JSON.stringify(result))
})
```

### 3. Infrastructure Hardening

#### Playwright Stability
```bash
# Ensure browsers are installed
npx playwright install chromium

# Add to deployment script
echo "npx playwright install chromium" >> deploy.sh
```

#### Database Connection Pooling
```typescript
// Use connection pooling for reliability
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false
  },
  global: {
    headers: { 'x-my-custom-header': 'my-app-name' },
  },
})
```

## Troubleshooting

### Common Issues

#### 1. Schema Cache Errors (PGRST204)
**Symptoms**: Scans fail to update to terminal state
**Solution**: Restart PostgREST or trigger schema reload
**Prevention**: Ensure schema reloads after migrations

#### 2. Playwright Browser Missing
**Symptoms**: All scans fail immediately with browser errors
**Solution**: Run `npx playwright install chromium`
**Prevention**: Include browser installation in deployment

#### 3. Database Connection Issues
**Symptoms**: Scans start but never update
**Solution**: Check database connectivity and connection limits
**Prevention**: Use connection pooling and monitoring

#### 4. High Memory Usage
**Symptoms**: Scans timeout or server becomes unresponsive
**Solution**: Restart application, check for memory leaks
**Prevention**: Monitor memory usage, implement scan concurrency limits

### Escalation

#### Level 1: Automated Recovery
- Use admin API endpoints
- Run database cleanup functions
- Restart services if needed

#### Level 2: Manual Investigation
- Check application logs
- Examine database state
- Verify infrastructure health

#### Level 3: Engineering Support
- Schema migration issues
- Application code bugs
- Infrastructure problems

## Contact Information

- **On-call Engineer**: [Your on-call system]
- **Database Admin**: [DBA contact]
- **Infrastructure Team**: [Infra team contact]
- **Documentation**: [Link to additional docs]

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2024-01-XX | 1.0 | Initial runbook creation |
| 2024-01-XX | 1.1 | Added automated cleanup procedures |
| 2024-01-XX | 1.2 | Enhanced troubleshooting section |

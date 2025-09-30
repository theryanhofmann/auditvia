# Schema Cache Refresh Guide

## Overview

PostgREST maintains a schema cache for performance. After database migrations that add new columns, tables, or functions, the cache must be refreshed to make changes visible to the API.

## When to Refresh

Refresh the schema cache when:
- Database migrations add new columns (e.g., `ended_at`, `last_activity_at`)
- New RPC functions are created (e.g., `update_scan_heartbeat`, `transition_scan_to_terminal`)
- RLS policies are updated
- Schema changes are deployed

## Methods

### 1. PostgREST Restart (Recommended)

The most reliable method is to restart the PostgREST service:

```bash
# If running via Docker
docker restart <postgrest-container>

# If running as systemd service
sudo systemctl restart postgrest

# If running manually
kill -HUP <postgrest-pid>
```

### 2. Schema Reload (Alternative)

If PostgREST is configured with schema reloading:

```bash
# Send SIGHUP to trigger schema reload
kill -HUP <postgrest-pid>
```

## Verification

After refreshing the cache:

1. **Check API Response**: Query an endpoint that uses the new columns
2. **Verify RPC Functions**: Test RPC function calls
3. **Check Logs**: Look for schema cache reload messages

### Example Verification

```bash
# Check if new columns are accessible
curl -H "Authorization: Bearer <token>" \
  "https://your-project.supabase.co/rest/v1/scans?select=ended_at,last_activity_at"

# Test RPC function
curl -X POST "https://your-project.supabase.co/rest/v1/rpc/update_scan_heartbeat" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"scan_id": "uuid", "progress_msg": "test"}'
```

## Troubleshooting

### Cache Not Updating
- Ensure PostgREST is actually restarting
- Check PostgREST logs for errors
- Verify database connection is working

### Migration Errors
- Run `supabase db reset` to recreate from migrations
- Check for migration conflicts
- Verify migration files are idempotent

### Permission Errors
- Check RLS policies allow service role access
- Verify function permissions are granted to service_role
- Check if functions are marked as SECURITY DEFINER

## Environment-Specific Notes

### Development
- Restart may be automatic with hot reload
- Cache issues are usually resolved by restarting the dev server

### Staging/Production
- Use deployment scripts to restart services
- Monitor service health after restart
- Have rollback plan for failed schema updates

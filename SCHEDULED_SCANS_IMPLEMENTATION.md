# Scheduled Scanning Implementation for Auditvia

## Overview

This implementation adds automated, scheduled accessibility scanning to Auditvia. The system runs every 12 hours to scan all sites with monitoring enabled, supporting custom domains and comprehensive logging.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cron Schedule │    │  Edge Function   │    │   Audit API     │
│   (12h interval)│────▶│ runScheduledScans│────▶│  /api/audit     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │scheduled_scan_logs│    │   scans table   │
                       │     (logging)     │    │   (results)     │
                       └──────────────────┘    └─────────────────┘
```

## Components Implemented

### 1. Database Layer

#### Migration: `0004_add_scheduled_scan_logs.sql`
- **Table**: `scheduled_scan_logs`
- **Purpose**: Track execution history, success/failure, and debugging info
- **Columns**:
  - `id` (UUID, primary key)
  - `site_id` (UUID, references sites table)
  - `scan_id` (UUID, references scans table, nullable)
  - `status` (success/failure enum)
  - `scanned_url` (text, tracks which URL was actually scanned)
  - `error_message` (text, nullable, for debugging)
  - `execution_time_ms` (integer, performance tracking)
  - `created_at` (timestamp)

#### Updated Types: `src/app/types/database.ts`
- Added TypeScript definitions for `scheduled_scan_logs` table
- Full type safety for all operations

### 2. Edge Function

#### Function: `supabase/functions/runScheduledScans/index.ts`
- **Trigger**: Cron schedule (every 12 hours)
- **Logic**:
  1. Fetch all sites with `monitoring = true`
  2. For each site, determine scan URL (custom_domain || url)
  3. Call `/api/audit` with service authentication
  4. Store results in `scans` table (via audit API)
  5. Log execution to `scheduled_scan_logs` table
- **Error Handling**: Comprehensive logging and graceful failure handling
- **Performance**: Individual scan timing and batch execution metrics

#### Configuration: `supabase/functions/config.toml`
- **Schedule**: `"0 6,18 * * *"` (6 AM and 6 PM UTC)
- **Environment Variables**: Function-specific settings
- **Timeouts**: 5-minute timeout per scan

### 3. Custom Domain Support

The scheduled scans fully support the custom domain feature:

```typescript
// Scan URL determination logic
const urlToScan = site.custom_domain 
  ? `https://${site.custom_domain}`
  : site.url
```

- **Priority**: Custom domain takes precedence over original URL
- **Logging**: `scanned_url` field tracks which URL was actually scanned
- **Backward Compatibility**: Falls back to original URL if no custom domain

### 4. Testing Infrastructure

#### Test Script: `scripts/test-scheduled-scans.ts`
- **Simulation Mode**: Shows what would be scanned without consuming quota
- **Actual Scanning**: `--run-scans` flag for real testing
- **Comprehensive Output**: Detailed logging and results summary
- **Database Integration**: Uses same logging as production function

#### Usage:
```bash
# Simulation (default)
npm run test:scheduled-scans

# Real scans (consumes quota)
npm run test:scheduled-scans -- --run-scans
```

### 5. Deployment Automation

#### Deployment Script: `scripts/deploy-scheduled-scans.sh`
- **Automated**: Full deployment pipeline in one command
- **Validation**: Checks for required files and dependencies
- **Migration**: Runs database migrations
- **Function Deployment**: Deploys Edge Function with cron schedule
- **Testing**: Validates deployment with test script

#### Usage:
```bash
npm run deploy:scheduled-scans
```

## Key Features

### 🎯 Smart Scanning Logic
- **Custom Domain Priority**: Uses custom domains when available
- **Fallback Strategy**: Falls back to original URL seamlessly
- **Site Identification**: Maintains site reference regardless of scan URL

### 📊 Comprehensive Logging
- **Execution Tracking**: Every scan execution is logged
- **Performance Metrics**: Timing data for optimization
- **Error Details**: Full error messages for debugging
- **Success Metrics**: Score and violation counts for successful scans

### 🔒 Security & Authentication
- **Service Role**: Uses Supabase service role for database access
- **API Authentication**: Service key authentication for audit API
- **Row Level Security**: Proper RLS policies for user data isolation

### ⚡ Performance Optimized
- **Sequential Processing**: Avoids overwhelming the audit service
- **Timeout Handling**: 5-minute timeout per scan
- **Resource Management**: Efficient memory and execution time usage
- **Concurrent Limits**: Configurable concurrent scan limits

### 🛡️ Error Resilience
- **Individual Failure Isolation**: One failed scan doesn't stop others
- **Detailed Error Logging**: Full error context for debugging
- **Graceful Degradation**: Continues processing on partial failures
- **Recovery Tracking**: Failed scans are logged for retry logic

## Integration Points

### With Existing Features
- **Dashboard**: Scan results appear in existing dashboard views
- **Site Settings**: Uses existing monitoring toggle
- **Scan History**: Results show in `/sites/[id]/history`
- **Custom Domains**: Fully integrated with custom domain feature

### API Compatibility
- **Audit API**: Uses existing `/api/audit` endpoint
- **Same Logic**: Identical scan logic as manual scans
- **Result Format**: Same data structure as interactive scans
- **User Association**: Proper user attribution for scans

## Monitoring & Maintenance

### Operational Monitoring
- **Supabase Dashboard**: Edge Function logs and metrics
- **Database Queries**: `scheduled_scan_logs` table for execution history
- **Performance Tracking**: Execution time trends and success rates

### Key Metrics to Monitor
- **Success Rate**: Percentage of successful vs failed scans
- **Execution Time**: Average scan duration and batch processing time
- **Error Patterns**: Common failure reasons and frequency
- **Site Coverage**: Number of monitored sites vs active scans

### Troubleshooting Queries
```sql
-- Recent scan execution summary
SELECT 
  DATE_TRUNC('day', created_at) as date,
  status,
  COUNT(*) as count,
  AVG(execution_time_ms) as avg_time
FROM scheduled_scan_logs 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY date, status
ORDER BY date DESC;

-- Failed scans for investigation
SELECT 
  ssl.created_at,
  s.name as site_name,
  ssl.scanned_url,
  ssl.error_message
FROM scheduled_scan_logs ssl
JOIN sites s ON s.id = ssl.site_id
WHERE ssl.status = 'failure'
  AND ssl.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ssl.created_at DESC;
```

## Future Enhancements

The implementation includes TODO comments for future features:

### 🔔 Notification System
- Email alerts for scan failures or low scores
- Dashboard notifications for new scan results
- Configurable alerting thresholds per site

### 📧 Reporting Features
- Weekly/monthly scan summary emails
- Trend analysis and score improvements
- Custom reporting schedules

### 🚨 Advanced Alerting
- Integration with external alerting systems (PagerDuty, Slack)
- Escalation policies for persistent failures
- SLA monitoring and breach notifications

### 🎛️ Configuration Options
- Per-site scan frequency customization
- Custom scan parameters and rule sets
- Business hours vs off-hours scheduling

## Production Checklist

Before deploying to production:

- [ ] Run database migrations (`0003` and `0004`)
- [ ] Deploy Edge Function with cron schedule
- [ ] Test with simulation mode
- [ ] Verify monitoring is enabled for test sites
- [ ] Run actual test scans to verify end-to-end flow
- [ ] Set up monitoring dashboards
- [ ] Configure alerting for function failures
- [ ] Document operational procedures
- [ ] Train team on troubleshooting procedures

## Environment Variables

Required for production deployment:

```env
# Supabase (automatically available in Edge Functions)
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application URL for API calls
APP_URL=https://your-app-domain.com

# Optional: Function-specific settings
MAX_CONCURRENT_SCANS=5
TIMEOUT_MS=300000
```

## Conclusion

This implementation provides a robust, scalable foundation for automated accessibility monitoring. The system is designed for production use with comprehensive error handling, logging, and monitoring capabilities. The modular architecture allows for easy extension with additional features as requirements evolve. 
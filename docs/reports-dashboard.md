# Reports Dashboard Documentation

## Overview

The Accessibility Reports Dashboard provides comprehensive analytics and insights into your team's accessibility compliance status. It aggregates data from all scans, violations, and remediation activities to help you track progress, identify trends, and prioritize fixes.

---

## Architecture

### Data Layer

**Database Views** (`/supabase/migrations/0060_create_report_views.sql`)

All analytics are powered by PostgreSQL views that aggregate data from the base tables (`sites`, `scans`, `issues`). Views are read-only and optimized with indexes.

| View Name | Purpose | Key Columns |
|-----------|---------|-------------|
| `report_kpis_view` | High-level KPIs for dashboard summary cards | `total_scans_30d`, `total_sites`, `monitored_sites`, `total_violations_30d`, `avg_score_30d`, `github_issues_created_30d` |
| `violations_trend_view` | Daily violation counts by severity | `date`, `total_violations`, `critical_count`, `serious_count`, `moderate_count`, `minor_count` |
| `fix_throughput_view` | Violations created vs. fixed over time | `date`, `violations_created`, `violations_fixed`, `net_change` |
| `top_rules_view` | Most frequent violation rules | `rule`, `impact`, `violation_count`, `affected_sites`, `github_issues_created` |
| `top_pages_view` | Sites ranked by violation count | `site_name`, `url`, `total_violations`, `score`, `*_count` by severity |
| `backlog_age_view` | Age of open violations | `rule`, `impact`, `days_old`, `occurrence_count` |
| `coverage_view` | Scan coverage and frequency | `site_name`, `last_scan_date`, `avg_days_between_scans`, `coverage_status` |
| `tickets_view` | GitHub issue creation stats | `total_issues_created`, `issues_created_7d`, `issues_created_30d` |
| `false_positive_view` | Placeholder for future false-positive tracking | Empty until `violation_status` field added |
| `risk_reduced_view` | Dollarized risk reduction by severity | `date`, `severity`, `current_risk`, `risk_reduced` |

**Risk Model:**
- Critical violation = $10,000
- Serious violation = $5,000
- Moderate violation = $1,000
- Minor violation = $100

---

### API Layer

**Endpoints** (`/src/app/api/reports/*`)

All endpoints follow a consistent pattern:

**Base URL:** `/api/reports/{endpoint}`

**Authentication:** Required (session-based)

**Query Parameters:**
- `teamId` (required): Team ID to scope data
- `siteId` (optional): Filter to specific site
- `startDate` (optional): ISO 8601 date (e.g., `2024-01-01`)
- `endDate` (optional): ISO 8601 date
- `severity` (optional): `critical | serious | moderate | minor`

**Response Format:**
```json
{
  "success": true,
  "data": [...],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional context"
}
```

#### Available Endpoints

| Endpoint | Returns | Use Case |
|----------|---------|----------|
| `/api/reports/kpis` | Single KPI object | Dashboard summary cards |
| `/api/reports/trend` | Array of daily data points | Violations trend chart |
| `/api/reports/fixes` | Array of fix throughput data | Fix velocity analysis |
| `/api/reports/top-rules` | Array of rules (sorted by count) | Identify most common issues |
| `/api/reports/top-pages` | Array of sites (sorted by violations) | Prioritize site remediation |
| `/api/reports/backlog` | Array of aged violations | Track tech debt |
| `/api/reports/coverage` | Array of coverage metrics | Monitor scan freshness |
| `/api/reports/tickets` | Array of ticket stats | Track GitHub integration usage |
| `/api/reports/risk` | Array of risk data points | Visualize $ impact |
| `/api/reports/false-positives` | Empty array (placeholder) | Future use |

---

### UI Layer

**Main Dashboard** (`/dashboard/reports`)

**Components:**
- `FilterBar`: Time range, site, and severity filters with URL sync
- `KPICards`: 4 summary cards (Score, Violations, Sites, GitHub Issues)
- `ViolationsTrendChart`: Stacked area chart of violations over time
- `TopRulesWidget`: Top 10 violation rules with bar visualization
- `TopPagesWidget`: Table of sites ranked by violation count
- `RiskReducedChart`: Area chart showing dollarized risk trend

**Drilldown Routes:**
- `/dashboard/reports/rules`: Full sortable/searchable table of all rules
- `/dashboard/reports/pages`: Full sortable/searchable table of all sites

---

## Features

### 1. Filters

**Time Range Presets:**
- Last 7 days
- Last 30 days (default)
- Last 90 days
- Last 180 days
- This month
- This quarter
- Custom date range

**Site Filter:**
- "All sites" or specific site selection
- Applies to all widgets consistently

**Severity Filter:**
- Critical / Serious / Moderate / Minor
- Single selection (exclusive)

**URL Sync:**
- All filter state is reflected in URL query parameters
- Shareable links maintain filter context
- Refresh preserves filters

### 2. Data Fetching

**Parallel Loading:**
- Each widget fetches data independently
- No blocking; widgets render as data arrives
- Automatic retry on failure

**Abort on Filter Change:**
- In-flight requests are aborted when filters change
- Prevents race conditions and stale data

### 3. Exports

**CSV Export:**
- Available on all widgets via "Export CSV" button
- Downloads client-side (no server roundtrip)
- Respects current filters
- Includes all columns with proper escaping

**File Naming Convention:**
```
{widget-name}-{timestamp}.csv
```

Examples:
- `violations-trend.csv`
- `top-rules.csv`
- `all-pages.csv`

### 4. Accessibility

**Keyboard Navigation:**
- All interactive elements are keyboard-accessible
- Logical tab order
- Skip links for screen readers

**ARIA Labels:**
- All charts have `role="img"` and descriptive `aria-label`
- Tables use semantic HTML (`<table>`, `<thead>`, `<th>`, etc.)
- Form controls have associated labels

**Screen Reader Summaries:**
- Each chart includes a `.sr-only` text summary
- Key metrics announced (e.g., "87% compliance score")

**Color Contrast:**
- All text meets WCAG AA standards (4.5:1 minimum)
- Severity badges use sufficient contrast

---

## Data Assumptions

1. **Violation Persistence:**
   - A violation is "fixed" if it appears in scan N but not in scan N+1
   - Age is calculated from first observed scan date

2. **Risk Calculation:**
   - Simplified model assigns fixed $ values per severity
   - Does not account for specific business impact

3. **False Positives:**
   - Not yet tracked; requires `violation_status` field on `issues` table
   - View exists as placeholder

4. **Scan Frequency:**
   - "Coverage" is based on time since last scan
   - Thresholds: recent (<7d), stale (7-30d), very stale (>30d)

---

## Performance

### Optimization Strategies

1. **Database-Level Aggregation:**
   - All math done in SQL views
   - No client-side aggregation
   - Indexed for common filter patterns

2. **Client-Side Caching:**
   - React hooks memoize data
   - Filter changes abort old requests

3. **Response Streaming:**
   - API routes return JSON immediately
   - No artificial delays

### Expected Performance

| Endpoint | Typical Response Time | Max Rows |
|----------|----------------------|----------|
| `/kpis` | <100ms | 1 |
| `/trend` | <200ms | 90 |
| `/top-rules` | <150ms | 20 |
| `/top-pages` | <150ms | 10 |
| `/backlog` | <200ms | 50 |
| `/coverage` | <100ms | All sites |
| `/tickets` | <100ms | All sites |
| `/risk` | <200ms | 90 |

---

## Security

### Access Control

1. **Team Scoping:**
   - All queries filtered by `team_id`
   - User must be a member of the team

2. **RLS (Row-Level Security):**
   - Views respect base table RLS policies
   - Service role used for API queries (trusted context)

3. **Input Validation:**
   - Query params sanitized
   - Date parsing validated
   - Enum values checked

### Secret Management

- No secrets exposed to client
- `SUPABASE_SERVICE_ROLE_KEY` server-side only
- API tokens never logged

---

## Troubleshooting

### Issue: "No data available"

**Possible Causes:**
- No scans have been run for the selected time range
- Selected site has no violations
- Database views not created

**Solution:**
1. Adjust time range to include more history
2. Check that scans have `status = 'completed'`
3. Verify views exist: `SELECT * FROM report_kpis_view LIMIT 1;`

### Issue: "Failed to fetch data"

**Possible Causes:**
- Network error
- API authentication failure
- Database connection timeout

**Solution:**
1. Check browser console for error details
2. Verify user is logged in and team member
3. Check server logs for database errors

### Issue: Filters not working

**Possible Causes:**
- URL params malformed
- Date range invalid

**Solution:**
1. Clear filters and try again
2. Check URL for valid ISO dates
3. Refresh page to reset state

---

## Future Enhancements

### Planned Features

1. **PDF Export:**
   - Full dashboard snapshot
   - Branded layout with logo
   - Includes all current filters

2. **Saved Views:**
   - Persist filter combinations
   - Named presets per user
   - Share views with team

3. **False Positive Tracking:**
   - Add `violation_status` enum to `issues` table
   - Allow marking violations as FP
   - Exclude FP from counts

4. **WCAG Progress Widget:**
   - Multi-line chart for A/AA/AAA/508
   - Separate scoring per standard

5. **Audit Readiness Score:**
   - Composite metric
   - Combines coverage, age, severity
   - Gauge visualization

---

## API Reference

### Example Request

```bash
curl "https://your-domain.com/api/reports/trend?teamId=abc123&timeRange=30d&severity=critical" \
  -H "Cookie: your-session-cookie"
```

### Example Response

```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "total_violations": 120,
      "critical_count": 15,
      "serious_count": 30,
      "moderate_count": 45,
      "minor_count": 30,
      "scan_count": 5
    },
    ...
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Maintenance

### Adding a New View

1. Create migration in `supabase/migrations/`
2. Define view with team_id filter
3. Grant SELECT to `authenticated` and `service_role`
4. Add corresponding API endpoint
5. Create TypeScript types
6. Add React hook
7. Build UI component
8. Update this documentation

### Updating Risk Model

To change severity $ values, edit `risk_reduced_view` in migration `0060_create_report_views.sql`:

```sql
WITH severity_weights AS (
  SELECT 'critical' as severity, 10000 as risk_value  -- Edit here
  UNION ALL SELECT 'serious', 5000
  ...
)
```

Then run: `supabase db push`

---

## Support

For questions or issues, contact the development team or file an issue in the repository.

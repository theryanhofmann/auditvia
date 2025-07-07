# Supabase Database Schema

This directory contains the database migrations for Auditvia's accessibility auditing platform.

## Schema Overview

### Tables

#### `sites`
Stores website URLs that users want to audit for accessibility compliance.

- `id` (UUID, PK): Unique identifier for the site
- `user_id` (UUID, FK → auth.users): Reference to the site owner
- `url` (TEXT): The website URL to audit
- `name` (TEXT): Optional display name for the site
- `created_at` (TIMESTAMPTZ): When the site was added
- `updated_at` (TIMESTAMPTZ): Last modification time (auto-updated)

#### `scans`
Stores individual audit runs for each site.

- `id` (UUID, PK): Unique identifier for the scan
- `site_id` (UUID, FK → sites): Reference to the audited site
- `score` (NUMERIC): Accessibility score (0-100)
- `started_at` (TIMESTAMPTZ): When the scan began
- `finished_at` (TIMESTAMPTZ): When the scan completed (null if running)
- `status` (TEXT): Current scan status ('pending', 'running', 'completed', 'failed')
- `created_at` (TIMESTAMPTZ): When the scan was created

#### `issues`
Stores individual accessibility issues found during scans.

- `id` (SERIAL, PK): Auto-incrementing unique identifier
- `scan_id` (UUID, FK → scans): Reference to the scan that found this issue
- `rule` (TEXT): WCAG rule identifier (e.g., 'color-contrast')
- `selector` (TEXT): CSS selector identifying the problematic element
- `severity` (TEXT): Issue severity ('critical', 'serious', 'moderate', 'minor')
- `impact` (TEXT): Impact level (same values as severity)
- `description` (TEXT): Human-readable description of the issue
- `help_url` (TEXT): Link to documentation for fixing the issue
- `html` (TEXT): HTML snippet of the problematic element
- `created_at` (TIMESTAMPTZ): When the issue was recorded

### Views

#### `scan_summaries`
Aggregated view providing scan overview with issue counts.

- Combines scan, site, and issue data
- Provides counts by severity level
- Includes site information for context
- Respects RLS policies (security_invoker = true)

## Row Level Security (RLS)

All tables have RLS enabled to ensure users can only access their own data:

### Sites
- Users can only view/modify sites where `user_id = auth.uid()`

### Scans
- Users can only access scans for sites they own
- Policies check ownership through the sites table

### Issues
- Users can only access issues for scans of sites they own
- Policies traverse the relationship: issues → scans → sites → user

## Performance Optimizations

### Indexes
- `idx_sites_user_id`: Fast lookups by user
- `idx_sites_url`: Unique URL validation
- `idx_scans_site_id`: Scan queries by site
- `idx_scans_started_at`: Time-based queries
- `idx_scans_status`: Status filtering
- `idx_issues_scan_id`: Issue queries by scan
- `idx_issues_severity`: Severity filtering
- `idx_issues_rule`: Rule-based analysis

### Triggers
- Auto-update `updated_at` timestamp on sites table modifications

## Running the Migration

1. **Initialize Supabase** (if not already done):
   ```bash
   npx supabase init
   ```

2. **Link to your project**:
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

3. **Apply the migration**:
   ```bash
   npx supabase db push
   ```

4. **Generate types** (optional but recommended):
   ```bash
   npx supabase gen types typescript --local > src/app/types/database.ts
   ```

## Environment Variables

Make sure these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Usage Examples

### Creating a Site
```typescript
const { data, error } = await supabase
  .from('sites')
  .insert({
    url: 'https://example.com',
    name: 'Example Site',
    user_id: user.id
  })
```

### Starting a Scan
```typescript
const { data, error } = await supabase
  .from('scans')
  .insert({
    site_id: siteId,
    status: 'pending'
  })
```

### Recording Issues
```typescript
const { data, error } = await supabase
  .from('issues')
  .insert(issues.map(issue => ({
    scan_id: scanId,
    rule: issue.rule,
    selector: issue.selector,
    severity: issue.severity,
    description: issue.description,
    help_url: issue.helpUrl,
    html: issue.html
  })))
```

### Getting Scan Summaries
```typescript
const { data, error } = await supabase
  .from('scan_summaries')
  .select('*')
  .eq('user_id', user.id)
  .order('started_at', { ascending: false })
``` 
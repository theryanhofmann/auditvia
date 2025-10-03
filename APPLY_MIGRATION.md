# Apply Deep Scan & Two-Tier System Migrations

## Quick Start

Apply both migrations in order to enable the two-tier classification system (Violations vs Advisories):

### Option 1: Supabase Dashboard (Recommended)

**Step 1: Deep Scan Schema**
1. Go to https://app.supabase.com/project/YOUR_PROJECT/editor
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy/paste the entire contents of `supabase/migrations/0016_deep_scan_prototype.sql`
5. Click "Run" (bottom right)
6. You should see "Success. No rows returned" ✅

**Step 2: Violations-Only Filtering**
1. Click "New Query" again
2. Copy/paste the entire contents of `supabase/migrations/0017_filter_violations_only.sql`
3. Click "Run" (bottom right)
4. You should see "Success. No rows returned" ✅

### Option 2: Supabase CLI

```bash
cd /Users/ryanhofmann/auditvia
supabase db push
```

This will apply both migrations automatically.

---

## Verify Migration

Run this in Supabase SQL Editor to verify all columns were added:

```sql
-- Check scans table
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'scans' 
  AND column_name IN (
    'scan_profile', 
    'pages_scanned', 
    'states_tested', 
    'violations_count', 
    'advisories_count',
    'scan_metadata'
  )
ORDER BY column_name;

-- Check issues table  
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'issues' 
  AND column_name IN (
    'tier', 
    'page_url', 
    'page_state', 
    'wcag_reference', 
    'requires_manual_review'
  )
ORDER BY column_name;

-- Check sites table
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sites' 
  AND column_name = 'default_scan_profile';
```

Expected output:
```
scans table: 6 rows (scan_profile, pages_scanned, states_tested, violations_count, advisories_count, scan_metadata)
issues table: 5 rows (tier, page_url, page_state, wcag_reference, requires_manual_review)
sites table: 1 row (default_scan_profile)
```

---

## What This Migration Does

### Updates to `scans` table:
- `scan_profile` - 'quick', 'standard', or 'deep'
- `pages_scanned` - Number of pages scanned (1-5)
- `states_tested` - Number of DOM states tested (1-15)
- `frames_scanned` - Number of iframes scanned (future use)
- `violations_count` - Count of WCAG violations
- `advisories_count` - Count of best-practice advisories
- `scan_metadata` - JSONB with detailed per-page results

### Updates to `issues` table:
- `tier` - 'violation' (WCAG) or 'advisory' (best practice)
- `page_url` - URL where issue was found
- `page_state` - DOM state when found (default, menu-open, etc.)
- `wcag_reference` - WCAG 2.2 criterion reference
- `requires_manual_review` - Flag for manual verification needed

### Updates to `sites` table:
- `default_scan_profile` - Default profile for new scans

### Indexes Created:
- `idx_issues_tier` - Fast filtering by violation/advisory
- `idx_issues_page_url` - Fast filtering by page

---

## Rollback (if needed)

If you need to undo the migration:

```sql
-- Remove columns from scans
ALTER TABLE scans 
  DROP COLUMN IF EXISTS scan_profile,
  DROP COLUMN IF EXISTS pages_scanned,
  DROP COLUMN IF EXISTS states_tested,
  DROP COLUMN IF EXISTS frames_scanned,
  DROP COLUMN IF EXISTS violations_count,
  DROP COLUMN IF EXISTS advisories_count,
  DROP COLUMN IF EXISTS scan_metadata;

-- Remove columns from issues
ALTER TABLE issues
  DROP COLUMN IF EXISTS tier,
  DROP COLUMN IF EXISTS page_url,
  DROP COLUMN IF EXISTS page_state,
  DROP COLUMN IF EXISTS wcag_reference,
  DROP COLUMN IF EXISTS requires_manual_review;

-- Remove column from sites
ALTER TABLE sites
  DROP COLUMN IF EXISTS default_scan_profile;

-- Drop indexes
DROP INDEX IF EXISTS idx_issues_tier;
DROP INDEX IF EXISTS idx_issues_page_url;
```

---

## Verify Two-Tier Classification

After applying both migrations, verify the system correctly separates violations from advisories:

```sql
-- Test tier classification
SELECT 
  tier,
  COUNT(*) as count,
  impact
FROM issues
WHERE scan_id IN (
  SELECT id FROM scans 
  WHERE created_at > NOW() - INTERVAL '1 day'
  ORDER BY created_at DESC 
  LIMIT 1
)
GROUP BY tier, impact
ORDER BY tier, impact DESC;
```

Expected output:
```
tier        | count | impact
----------- | ----- | ----------
violation   | 45    | critical
violation   | 28    | serious
violation   | 12    | moderate
advisory    | 8     | moderate
advisory    | 5     | minor
```

**Verify compliance calculations exclude advisories:**

```sql
-- Check KPI view (should only count violations)
SELECT total_violations_30d 
FROM report_kpis_view 
WHERE team_id = 'YOUR_TEAM_ID';

-- Check risk view (should only calculate risk for violations)
SELECT 
  estimated_risk,
  critical_count,
  serious_count
FROM risk_reduced_view
ORDER BY created_at DESC
LIMIT 5;
```

## After Migration

1. ✅ Deploy your app: `npm run build && vercel --prod`
2. ✅ Test a Deep Scan on a real site
3. ✅ Verify violations vs advisories are correctly classified
4. ✅ Check compliance score only includes violations
5. ✅ Verify risk calculations exclude advisories
6. ✅ Check analytics for events

---

## Troubleshooting

**Error: "column already exists"**
- This is safe to ignore - it means the column was already added
- The migration uses `ADD COLUMN IF NOT EXISTS` for safety

**Error: "permission denied"**
- Make sure you're logged in to Supabase
- Use the SQL Editor in the dashboard (not CLI)
- Contact Supabase support if issue persists

**Error: "relation does not exist"**
- Make sure you're running on the correct database
- Check that `scans`, `issues`, and `sites` tables exist

---

That's it! Once the migration runs successfully, your Deep Scan v1 is fully deployed. 🚀


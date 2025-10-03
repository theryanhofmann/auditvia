# Migration & Deployment Playbook

> Complete guide for managing database migrations in Auditvia

## Quick Start

### Verify Local Schema
```bash
npm run verify:migrations
```
- Automatically loads `.env.local` or `.env`
- Checks extensions, tables, views, and columns
- Shows clear pass/fail checklist
- No secrets printed to console

### Push Migrations to Remote
```bash
npm run db:push
```
- Wraps `npx supabase db push --include-all`
- Applies all pending migrations to remote database
- Shows which migrations were applied

## Developer Workflow

### 1. Create a New Migration
```bash
npx supabase migration new descriptive_name
```

This creates a new file in `supabase/migrations/` with a timestamp prefix.

### 2. Write Idempotent SQL
Always use guards to make migrations re-runnable:

**Tables:**
```sql
CREATE TABLE IF NOT EXISTS my_table (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL
);
```

**Columns:**
```sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'my_table' AND column_name = 'new_column'
  ) THEN
    ALTER TABLE my_table ADD COLUMN new_column text;
  END IF;
END $$;
```

**Indexes:**
```sql
CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);
```

**Note:** Don't use `CONCURRENTLY` in migrations (not allowed in transactions).

**Views:**
```sql
CREATE OR REPLACE VIEW my_view AS
SELECT id, name FROM my_table;
```

**Policies:**
```sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'my_table' AND policyname = 'my_policy'
  ) THEN
    CREATE POLICY my_policy ON my_table FOR SELECT USING (true);
  END IF;
END $$;
```

**Enum Types:**
```sql
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'my_enum'
  ) THEN
    CREATE TYPE my_enum AS ENUM ('value1', 'value2');
  END IF;
END $$;
```

**Functions:**
```sql
-- Drop first if return type might change
DROP FUNCTION IF EXISTS my_function(arg1 type) CASCADE;

CREATE OR REPLACE FUNCTION my_function(arg1 type)
RETURNS return_type AS $$
BEGIN
  -- function body
END;
$$ LANGUAGE plpgsql;
```

### 3. Test Locally
```bash
# Start local Supabase
npx supabase start

# Push migrations to local DB
npm run db:push

# Verify everything is working
npm run verify:migrations

# Check the app
npm run dev
```

### 4. Push to Remote
```bash
# Verify local first
npm run verify:migrations

# Push to remote (production/staging)
npm run db:push

# Verify remote
npm run verify:migrations
```

## Environment Setup

### Required Environment Variables

Create `.env.local` with:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # For verify script
```

The verification script will automatically load these from:
1. `.env.local` (preferred for local development)
2. `.env` (fallback)
3. Environment variables (for CI/CD)

### Security
- Secrets are **never** printed to console
- Only presence/absence indicators are shown
- Format: `🔑 Using API key: eyJhbGciOiJIUzI1N...xyz`

## Troubleshooting

### Migration Push Fails with "cannot change name of view column"

This happens when a view exists with different columns. Fix:
1. Create a repair migration that drops the view:
   ```sql
   DROP VIEW IF EXISTS problematic_view CASCADE;
   ```
2. Then your next migration can recreate it with new columns
3. Or use `CREATE OR REPLACE VIEW` if only changing the query logic

### Missing Extensions Error

If you see `uuid_generate_v4() does not exist`:
1. Check that `0000_ensure_extensions.sql` exists and runs first
2. Verify it contains:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
3. Always use `gen_random_uuid()` instead of `uuid_generate_v4()`

### Verify Script Shows "Missing Credentials"

1. Check that `.env.local` exists and contains required keys
2. Verify the keys are not commented out
3. Ensure no extra quotes or spaces around values
4. Run: `cat .env.local | grep SUPABASE` to confirm format

### Migration Order Issues

Migrations run in alphabetical/numerical order. If you need to:
- **Add a migration between existing ones**: Create a repair migration
- **Fix a broken migration**: Make it idempotent and re-run
- **Skip a migration**: Don't delete it; make it a no-op with guards

## Health Check Endpoint

The `/api/health/db` endpoint provides runtime health checks:

```bash
curl http://localhost:3000/api/health/db | jq
```

Returns:
```json
{
  "migrationsOk": true,
  "tables": {
    "team_invites": true,
    "audit_logs": true,
    ...
  },
  "views": {
    "report_kpis_view": true,
    ...
  },
  "columns": {
    "issues.github_issue_url": true,
    ...
  }
}
```

Use this in:
- CI/CD health checks
- Monitoring dashboards
- Post-deployment verification

## CI/CD Integration

### Example GitHub Action
```yaml
- name: Verify Database Migrations
  run: npm run verify:migrations
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}

- name: Push Migrations
  run: npm run db:push
  if: github.ref == 'refs/heads/main'
```

## Best Practices

### ✅ DO
- Write idempotent migrations (always use `IF NOT EXISTS` guards)
- Test migrations locally before pushing to remote
- Use `gen_random_uuid()` for UUID defaults
- Document complex migrations with comments
- Keep migrations small and focused
- Use `CREATE OR REPLACE` for views and functions
- Add grants for new tables/views

### ❌ DON'T
- Use `CREATE INDEX CONCURRENTLY` in migrations
- Drop tables with data without explicit confirmation
- Assume migration order without testing
- Skip verification after pushing
- Use `uuid_generate_v4()` (use `gen_random_uuid()`)
- Commit migrations without testing locally
- Mix data changes with schema changes

## Required Objects

### Extensions
- `pgcrypto` (for `gen_random_uuid()`)
- `uuid-ossp` (legacy, prefer `pgcrypto`)

### Tables
- `team_invites` - Team invitation tracking
- `audit_logs` - Audit trail for team actions
- `pdf_generation_jobs` - PDF report generation
- `sites` - User websites
- `scans` - Accessibility scans
- `issues` - Violations found
- `teams` - User teams
- `team_members` - Team membership

### Views (Reports Dashboard)
- `report_kpis_view` - Summary KPIs
- `violations_trend_view` - Daily violation trends
- `fix_throughput_view` - Fix velocity tracking
- `top_rules_view` - Most common violations
- `top_pages_view` - Sites with most violations
- `backlog_age_view` - Age of open violations
- `coverage_view` - Scan frequency by site
- `tickets_view` - GitHub issue statistics
- `false_positive_view` - False positive tracking (placeholder)
- `risk_reduced_view` - Risk reduction metrics

### Columns
- `issues.github_issue_url` - Link to GitHub issue
- `issues.github_issue_number` - Issue number
- `issues.github_issue_created_at` - When issue was created
- `sites.github_repo` - Associated GitHub repo
- `sites.repository_mode` - Repo access mode (public/private/app)

## Support

If you encounter migration issues:
1. Run `npm run verify:migrations` to see what's missing
2. Check `/api/health/db` for runtime status
3. Review recent migration files in `supabase/migrations/`
4. Check Supabase logs for detailed SQL errors
5. Consult this playbook for common fixes


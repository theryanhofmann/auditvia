# Development Notes

## Migration Ordering Fix (2025-01-XX)

### Problem
The migration system had dependency issues where `0017_add_team_id_to_sites.sql` referenced the `teams` table before it was created in `0029_add_teams.sql`, causing:
```
ERROR: relation "teams" does not exist (SQLSTATE 42P01)
```

### Solution: Migration Reordering
**Strategy chosen**: Reorder migrations (preferred over patch migrations)

**Changes made**:
1. **Renamed `0029_add_teams.sql` → `0015_add_teams.sql`** to run before `0017_add_team_id_to_sites.sql`
2. **Fixed column references** in dependent migrations:
   - `0017_add_team_id_to_sites.sql`: Fixed `u.name` → `'My Team'` (name column doesn't exist yet)
   - `0017_add_team_id_to_sites.sql`: Fixed `created_at` → `joined_at` for team_members table
3. **Made referral migrations defensive** by adding column existence checks:
   - `0018_add_referral_system.sql`
   - `0031_fix_referral_code.sql`
   - `0032_fix_referral_constraint.sql`
   - `0034_fix_referral_types.sql`

### Scan Schema Hardening
**Applied migrations**:
- `0045_add_scan_error_message.sql` - Adds error_message column
- `0047_fix_scans_schema_final.sql` - Comprehensive schema alignment

**Schema now includes**:
```sql
-- All required columns for scan reports
error_message TEXT                    -- Stores scan failure details
completed_at TIMESTAMPTZ             -- Alias for finished_at
updated_at TIMESTAMPTZ DEFAULT NOW() -- Last modification timestamp
total_violations INTEGER DEFAULT 0   -- Violation count
passes INTEGER DEFAULT 0             -- Passed checks
incomplete INTEGER DEFAULT 0         -- Incomplete checks
inapplicable INTEGER DEFAULT 0       -- Inapplicable checks
scan_time_ms INTEGER                 -- Scan duration
```

### Commands for Both Paths

#### Reset Path (Recommended for Dev)
```bash
# Stop and reset database with fixed migration order
npx supabase stop
npx supabase start
npx supabase db reset --local

# If reset fails partway, manually apply scan migrations:
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/migrations/0045_add_scan_error_message.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/migrations/0047_fix_scans_schema_final.sql

# Start development server
npm run dev
```

#### No-Reset Path (Production/Safe)
```bash
# If you need to repair failed migrations
npx supabase db repair <failed_migration_version>
npx supabase db push --local

# Or manually apply just the scan schema fixes
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/migrations/0045_add_scan_error_message.sql
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/migrations/0047_fix_scans_schema_final.sql
```

### Verification
✅ **Migration Order**: `0015_add_teams.sql` runs before `0017_add_team_id_to_sites.sql`  
✅ **Schema Complete**: All scan columns exist without 42703 errors  
✅ **API Response**: `/api/audit` returns proper 401/201 responses  
✅ **Report Loading**: No more "column does not exist" errors  
✅ **Polling**: Scan status transitions work correctly  

### Files Modified
- `supabase/migrations/0029_add_teams.sql` → `supabase/migrations/0015_add_teams.sql`
- `supabase/migrations/0017_add_team_id_to_sites.sql` (column reference fixes)
- `supabase/migrations/0018_add_referral_system.sql` (defensive column checks)
- `supabase/migrations/0031_fix_referral_code.sql` (defensive column checks)
- `supabase/migrations/0032_fix_referral_constraint.sql` (defensive column checks)
- `supabase/migrations/0034_fix_referral_types.sql` (defensive column checks)
- `src/app/dashboard/reports/[scanId]/page.tsx` (schema error handling)
- `src/app/dashboard/reports/[scanId]/ScanRunningPage.tsx` (polling improvements)
- `src/app/api/audit/route.ts` (error_message support)

### Next Steps
- Test complete scan flow: create site → run scan → view report
- Verify Recent Scans navigation works correctly
- Monitor logs for any remaining 42703 errors

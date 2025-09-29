# Contributing to Auditvia

## Database Migrations

### Migration Naming Convention

We use 14-digit timestamp prefixes for our migrations (e.g., `20250802T1530_add_feature.sql`). This helps maintain a clear order and prevents prefix collisions in parallel development.

#### Rules:
1. Every migration must have a unique timestamp prefix
2. Use format: YYYYMMDDTHHmm (e.g., 20250802T1530)
3. After the prefix, use descriptive names in snake_case
4. Always include the `.sql` extension
5. Never reuse a timestamp prefix, even if the migration was reverted

Examples:
```sql
✅ Good:
20250802T1530_add_user_preferences.sql
20250802T1545_create_audit_log.sql
20250802T1600_update_team_roles.sql

❌ Bad:
250802T1530_add_preferences.sql   # Year must be 4 digits
20250802_add_preferences.sql      # Missing time component
20250802T1530add_preferences.sql  # Missing underscore
20250802T1530_Add_Preferences.sql # Wrong case
20250802T1530_add_preferences     # Missing extension
```

#### Timestamp Generation:
```bash
# Generate a migration name with current timestamp
echo $(date +"%Y%m%dT%H%M")_your_migration_name.sql

# Example output: 20250802T1530_your_migration_name.sql
```

#### Collision Prevention:
1. Always generate a new timestamp when creating a migration
2. If you need to modify a migration before it's merged:
   - Keep the original timestamp if it's a simple fix
   - Generate a new timestamp if the changes are substantial
3. Never reuse a timestamp from a reverted migration
4. CI will reject any PR with duplicate timestamps

### Before Creating a Migration

1. Check the latest migration number in `supabase/migrations/`
2. Increment that number by 1 for your new migration
3. Verify no other PR is using the same number
4. Test your migration locally with `supabase db reset`

### Migration Guidelines

1. **Idempotency**: Migrations should be idempotent when possible
   ```sql
   -- Good: Uses IF NOT EXISTS
   CREATE TABLE IF NOT EXISTS users (...)
   
   -- Good: Drops before creating
   DROP FUNCTION IF EXISTS my_function;
   CREATE FUNCTION my_function...
   ```

2. **Reversibility**: Include a `.down.sql` file for reversible changes
   ```sql
   -- 0031_add_column.sql
   ALTER TABLE users ADD COLUMN status TEXT;
   
   -- 0031_add_column.down.sql
   ALTER TABLE users DROP COLUMN status;
   ```

3. **Atomic Changes**: Each migration should be self-contained
   ```sql
   -- Good: Complete feature in one migration
   CREATE TABLE teams (...);
   CREATE POLICY "team_access" ON teams ...;
   CREATE TRIGGER team_audit ...;
   
   -- Bad: Split across migrations
   -- 0031_create_team.sql
   CREATE TABLE teams (...);
   -- 0032_add_team_policy.sql
   CREATE POLICY "team_access" ...;
   ```

### Testing Migrations

Before submitting a PR:

1. Reset your local database:
   ```bash
   supabase db reset
   ```

2. Verify migrations apply cleanly:
   ```bash
   supabase migration up
   ```

3. If you have a `.down.sql`, test rollback:
   ```bash
   supabase migration down -n 1
   ```

### Common Issues

1. **Prefix Collisions**: Two PRs using the same number
   - Solution: Coordinate with other PR authors
   - Rebase and renumber if needed

2. **Failed Migrations**: Migration fails to apply
   - Check for dependencies (tables, types, etc.)
   - Verify syntax is compatible with Postgres version
   - Test with clean database state

3. **Type Conflicts**: Issues with custom types
   - Use `DROP TYPE IF EXISTS` before `CREATE TYPE`
   - Consider using `DO $$ BEGIN ... END $$` blocks

### Getting Help

If you're unsure about a migration:
1. Ask in #engineering channel
2. Create a draft PR for review
3. Run `supabase db diff` to verify changes
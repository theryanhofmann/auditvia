# Contributing to Auditvia

## Database Migrations

### Migration Naming Convention

We use sequential numeric prefixes for our migrations (e.g., `0031_add_feature.sql`). This helps maintain a clear order and makes it easy to track the latest migration number.

#### Rules:
1. Every migration must have a unique prefix number
2. Prefix numbers must be sequential (e.g., 0031 follows 0030)
3. Use leading zeros to maintain consistent 4-digit format
4. After the prefix, use descriptive names in snake_case
5. Always include the `.sql` extension

Examples:
```sql
✅ Good:
0031_add_user_preferences.sql
0032_create_audit_log.sql
0033_update_team_roles.sql

❌ Bad:
31_add_preferences.sql        # Missing leading zeros
0031add_preferences.sql      # Missing underscore
0031_Add_Preferences.sql     # Wrong case
0031_add_preferences         # Missing extension
```

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
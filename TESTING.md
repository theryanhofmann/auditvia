# Auditvia Testing Guide

Complete guide for running the full test suite with real Supabase backend.

## Prerequisites

- **Node.js 20+** installed
- **Docker Desktop** installed and running (required for local Supabase)
- **Supabase CLI** installed globally

```bash
npm install -g supabase
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Local Supabase

```bash
npm run supabase:start
```

This will:
- Start PostgreSQL database
- Start Supabase services (Auth, Storage, API)
- Apply all migrations automatically
- Display connection details

**Expected output:**
```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### 4. Stop Supabase

```bash
npm run supabase:stop
```

---

## Test Suites

### Unit Tests
- **Location**: `__tests__/*.test.ts`
- **Purpose**: Test individual functions and utilities
- **Runtime**: Fast (< 1s)
- **Dependencies**: None (mocked)

### Integration Tests
- **Location**: `__tests__/team-rls.test.ts`
- **Purpose**: Test database RLS policies with real Supabase
- **Runtime**: Moderate (5-10s)
- **Dependencies**: Local Supabase instance

### E2E Tests
- **Location**: `__tests__/e2e/*.spec.ts`
- **Purpose**: Test full user flows with Playwright
- **Runtime**: Slow (30s+)
- **Dependencies**: Running Next.js server + Supabase

---

## CI/CD Pipeline

### GitHub Actions Workflow

Every push and PR triggers:
1. ✅ **Lint** - ESLint check
2. ✅ **Type Check** - TypeScript validation
3. ✅ **Unit Tests** - Fast isolated tests
4. ✅ **Integration Tests** - Real Supabase tests
5. ✅ **Deploy Preview** (PRs) - Vercel preview deployment
6. ✅ **Deploy Production** (main) - Production deployment

**File**: `.github/workflows/test.yml`

### Required GitHub Secrets

For production deployments, add these secrets in GitHub repo settings:

```
VERCEL_TOKEN              - Vercel deployment token
VERCEL_ORG_ID            - Your Vercel organization ID
VERCEL_PROJECT_ID        - Your Vercel project ID
SUPABASE_ACCESS_TOKEN    - Supabase CLI access token
SUPABASE_PROJECT_REF     - Your Supabase project reference
```

---

## Local Development Workflow

### Day-to-Day Development

```bash
# 1. Start Supabase (once per day)
npm run supabase:start

# 2. Start Next.js dev server
npm run dev

# 3. Run tests in watch mode (optional)
npm run test:watch

# 4. Make changes, tests auto-run

# 5. Stop Supabase when done
npm run supabase:stop
```

### Database Migrations

```bash
# Create a new migration
npx supabase migration new your_migration_name

# Edit the migration file in supabase/migrations/

# Apply migration to local database
npm run db:push

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### Testing RLS Policies

The integration tests in `__tests__/team-rls.test.ts` verify:
- ✅ Team owners can create invites
- ✅ Members cannot create invites
- ✅ Owners can update member roles
- ✅ Members cannot update roles
- ✅ Team members can view other members
- ✅ Outsiders cannot view team data
- ✅ Audit logs are properly scoped to teams

---

## Troubleshooting

### Supabase won't start

**Error**: "Docker daemon not running"
```bash
# Solution: Start Docker Desktop
open -a Docker
```

**Error**: "Port already in use"
```bash
# Solution: Stop conflicting services or reset Supabase
npm run supabase:stop
docker ps  # Check for running containers
docker stop $(docker ps -q)  # Stop all containers
npm run supabase:start
```

### Tests failing with "fetch failed"

**Cause**: Supabase not running or wrong connection details

**Solution**:
```bash
# Check Supabase status
npm run supabase:status

# If not running, start it
npm run supabase:start

# Verify environment variables in test file match:
# NEXT_PUBLIC_SUPABASE_URL: http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY: (from supabase start output)
```

### Migrations not applied

```bash
# Manually apply migrations
npm run db:push

# Or reset and reapply all migrations
npm run db:reset
```

### Tests pass locally but fail in CI

**Cause**: Environment differences or timing issues

**Solutions**:
1. Check GitHub Actions logs for specific errors
2. Ensure all migrations are committed to git
3. Add `await` for async operations
4. Increase timeout for slow operations

---

## Performance Benchmarks

| Test Suite | Duration | Dependencies |
|------------|----------|--------------|
| Lint       | ~5s      | None         |
| Type Check | ~10s     | None         |
| Unit Tests | ~2s      | None         |
| Integration| ~10s     | Supabase     |
| E2E Tests  | ~60s     | Full stack   |

**Total CI Pipeline**: ~2-3 minutes per run

---

## Best Practices

### Writing Tests

1. **Test behavior, not implementation**
   ```typescript
   // ✅ Good
   expect(user).toHaveAccess(resource)
   
   // ❌ Bad
   expect(user.permissions.includes('read')).toBe(true)
   ```

2. **Use descriptive test names**
   ```typescript
   // ✅ Good
   it('should allow owner to invite new members')
   
   // ❌ Bad
   it('test1')
   ```

3. **Clean up after tests**
   ```typescript
   afterEach(async () => {
     await cleanupTestData()
   })
   ```

4. **Use real data, avoid mocks for integration tests**
   ```typescript
   // ✅ Good - tests real database behavior
   const { data } = await supabase.from('teams').insert(...)
   
   // ❌ Bad - doesn't test RLS policies
   jest.mock('@supabase/supabase-js')
   ```

### Database Setup

1. **Always use migrations** - Never manually alter the database
2. **Test migrations locally** before committing
3. **Use transactions** in tests to rollback changes
4. **Seed test data** in `beforeAll` hooks
5. **Clean up** in `afterAll` hooks

---

## Additional Resources

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Testing](https://playwright.dev/docs/intro)
- [GitHub Actions](https://docs.github.com/en/actions)

---

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review GitHub Actions logs for CI failures
3. Check Supabase logs: `npx supabase logs`
4. Open an issue with full error logs


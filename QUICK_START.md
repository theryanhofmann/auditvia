# 🚀 Quick Start - Testing

## The Problem
Tests are failing because Supabase isn't running locally.

## The Solution

### Step 1: Start Supabase (Required)

```bash
# Start Supabase (this takes 2-3 minutes first time)
npm run supabase:start
```

**Wait for this message:**
```
Started supabase local development setup.
API URL: http://127.0.0.1:54321
```

### Step 2: Run Tests

```bash
# Run integration tests (requires Supabase)
npm run test:integration
```

**Expected result:** ✅ All 8 tests pass

---

## Test Commands

| Command | What it does | Requires |
|---------|-------------|----------|
| `npm run test:integration` | RLS policy tests | Supabase running |
| `npm run test:e2e` | Playwright E2E tests | Next.js + Supabase running |
| `npm test` | All Jest tests | Supabase running |

---

## Full Setup (First Time Only)

```bash
# 1. Install dependencies
npm install

# 2. Start Supabase
npm run supabase:start

# 3. Run tests
npm run test:integration
```

---

## Troubleshooting

### ❌ "fetch failed" errors
**Cause:** Supabase not running  
**Fix:** `npm run supabase:start`

### ❌ "Docker daemon not running"
**Cause:** Docker Desktop not running  
**Fix:** Start Docker Desktop, then `npm run supabase:start`

### ❌ "Port already in use"
**Cause:** Previous Supabase instance running  
**Fix:** `npm run supabase:stop && npm run supabase:start`

---

## What Tests Were Excluded?

For the initial MVP, these tests are **temporarily excluded** (to be fixed later):

- ❌ `__tests__/e2e/` - Playwright tests (run with `npm run test:e2e`)
- ❌ `scripts/monitoring.test.ts` - Has a bug (needs fixing)
- ❌ `__tests__/team-last-owner-guard.test.ts` - Needs Next.js server running

**Working tests:**
- ✅ `__tests__/team-rls.test.ts` - 8 integration tests with Supabase

---

## Quick Commands Reference

```bash
# Supabase Management
npm run supabase:start    # Start Supabase
npm run supabase:stop     # Stop Supabase
npm run supabase:status   # Check status

# Testing
npm run test:integration  # Run integration tests
npm test                  # Run all Jest tests
npm run test:watch        # Watch mode

# Database
npm run db:push          # Apply migrations
npm run db:reset         # Reset database (WARNING: deletes data)
```

---

## Expected Test Output

When you run `npm run test:integration`, you should see:

```
 PASS  __tests__/team-rls.test.ts
  Team RLS Policies
    team_invites RLS
      ✓ should allow owner to create invites (XXXms)
      ✓ should block member from creating invites (XXXms)
      ✓ should block outsider from viewing team invites (XXXms)
    team_members RLS
      ✓ should allow owner to update member roles (XXXms)
      ✓ should block member from updating roles (XXXms)
      ✓ should allow team members to view other members (XXXms)
    audit_logs RLS
      ✓ should allow team members to view audit logs (XXXms)
      ✓ should block outsider from viewing team audit logs (XXXms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

---

## Still Having Issues?

1. Check Docker is running: `docker ps`
2. Check Supabase status: `npm run supabase:status`
3. Reset everything:
   ```bash
   npm run supabase:stop
   docker stop $(docker ps -q)
   npm run supabase:start
   ```

4. See full guide: `TESTING.md`


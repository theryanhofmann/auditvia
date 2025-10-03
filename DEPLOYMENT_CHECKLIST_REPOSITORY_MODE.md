# Repository Mode Feature - Deployment Checklist

## Pre-Deployment

### ✅ Code Review
- [x] All code changes reviewed
- [x] TypeScript strict mode clean
- [x] No console errors or warnings
- [x] Error handling is robust
- [x] User-facing error messages are actionable

### ✅ Database Migrations
- [ ] Migration `0057_add_github_repo_to_sites.sql` applied
- [ ] Migration `0058_add_repository_mode.sql` applied
- [ ] PostgREST schema cache reloaded
- [ ] All existing sites have default `repository_mode = 'issue_only'`

### ✅ Environment Configuration
- [ ] `GITHUB_TOKEN` environment variable set (repo scope)
- [ ] Token tested and verified working
- [ ] `.env.local` documented in team docs

## Deployment Steps

### 1. Apply Database Migrations

**Option A: Via Supabase CLI**
```bash
supabase db push
```

**Option B: Via Supabase Dashboard (SQL Editor)**
```sql
-- Migration 1: Add github_repo column
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS github_repo TEXT;
CREATE INDEX IF NOT EXISTS idx_sites_github_repo ON public.sites(github_repo) WHERE github_repo IS NOT NULL;

-- Migration 2: Add repository_mode enum and column
CREATE TYPE repository_mode AS ENUM ('issue_only', 'pr');
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS repository_mode repository_mode DEFAULT 'issue_only';
UPDATE public.sites SET repository_mode = 'issue_only' WHERE github_repo IS NOT NULL AND repository_mode IS NULL;
CREATE INDEX IF NOT EXISTS idx_sites_repository_mode ON public.sites(repository_mode) WHERE repository_mode IS NOT NULL;
```

### 2. Reload PostgREST Schema Cache

**Via Supabase Dashboard:**
1. Go to Settings → API
2. Click "Reload schema cache"
3. Wait for confirmation

**Via API (if applicable):**
```bash
curl -X POST "https://your-project.supabase.co/rest/v1/rpc/pg_catalog.pg_reload_conf" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### 3. Set Environment Variable

Add to `.env.local` (dev) and production environment:
```bash
GITHUB_TOKEN=ghp_your_personal_access_token
```

**Token Requirements:**
- Scope: `repo` (full control of private repositories)
- Expiration: Set appropriately for your security policy
- Never commit to version control

### 4. Deploy Application

```bash
# Build and verify
npm run build

# Deploy to production
# (your deployment process here)
```

### 5. Restart Services

Ensure all services pick up:
- New environment variables
- Latest code
- Updated database schema

## Post-Deployment Verification

### Smoke Tests

#### Test 1: Repository Validation
1. Go to any site settings page
2. Navigate to "GitHub Integration" section
3. Enter a valid repository (e.g., `your-org/test-repo`)
4. Click "Validate"
5. ✅ **Expected**: Green checkmark with "Repository validated successfully"

#### Test 2: Mode Selection
1. In GitHub Integration section
2. Toggle between "Issue-Only" and "PR Mode"
3. ✅ **Expected**: UI updates, PR Mode shows "Soon" badge and is disabled

#### Test 3: Save Repository Settings
1. Enter a valid repository
2. Validate it
3. Click "Save Repository Settings"
4. ✅ **Expected**: Toast "Repository settings saved successfully!"
5. Refresh page
6. ✅ **Expected**: Settings persisted

#### Test 4: Create GitHub Issue
1. Run a scan with violations
2. Open the report
3. Expand any violation
4. ✅ **Expected**: Button label is "Create GitHub Issue" (if issue_only mode)
5. Click the button
6. ✅ **Expected**: 
   - Issue created successfully
   - Toast with link to GitHub issue
   - Issue contains all expected sections (description, WCAG, how to fix, etc.)
   - Labels include: `accessibility`, `severity:X`, `wcag:rule-id`, `mode:issue_only`, `auditvia`

#### Test 5: Missing Token Handling
1. Temporarily remove `GITHUB_TOKEN` from environment
2. Restart server
3. Try to create an issue
4. ✅ **Expected**: 
   - User-friendly toast: "GitHub Not Configured"
   - Message includes actionable guidance
   - Link to documentation (if provided)
   - No stack traces or technical errors visible to user

#### Test 6: Invalid Repository
1. In site settings, enter invalid repository (e.g., `invalid repo name`)
2. Click "Validate"
3. ✅ **Expected**: Red error message "Invalid repository format. Use: owner/repo"

#### Test 7: Repository Not Found
1. Enter a repository that doesn't exist (e.g., `nonexistent/repo-12345`)
2. Click "Validate"
3. ✅ **Expected**: Error "Repository not found or you don't have access"

#### Test 8: Backward Compatibility
1. Check a site that was created before this feature
2. ✅ **Expected**:
   - No errors in console
   - Settings page loads correctly
   - `repository_mode` defaults to `issue_only`
   - Button on violations says "Create GitHub Issue"

### Analytics Verification

Check that the following events are being tracked:
- `github_issue_created` (with `mode`, `ruleId`, `impact`, `repo`)
- Any validation or save failures

### Error Monitoring

1. Check error logs for any new errors
2. Verify no schema-related errors
3. Confirm no unauthorized access attempts

## Rollback Plan

If critical issues are found:

### 1. Quick Fix (Code Only)
```bash
git revert <commit-hash>
git push
# Redeploy
```

### 2. Full Rollback (Including DB)

**⚠️ WARNING: Only if absolutely necessary**

```sql
-- Remove repository_mode column
ALTER TABLE public.sites DROP COLUMN IF EXISTS repository_mode;

-- Remove enum type
DROP TYPE IF EXISTS repository_mode;

-- Optionally remove github_repo if needed
ALTER TABLE public.sites DROP COLUMN IF EXISTS github_repo;
```

Then redeploy previous version of code.

## Monitoring

### What to Watch (First 24 Hours)

1. **Error Rate**: Should not increase
2. **Issue Creation Success Rate**: Track via analytics
3. **User Feedback**: Monitor support channels
4. **GitHub API Rate Limits**: Should stay well below limits
5. **Database Performance**: Watch for slow queries on `sites` table

### Key Metrics

- Total issues created per day
- Success vs. failure rate
- Most common error types
- Repository validation requests

## Documentation Updates

- [x] Updated `/docs/integrations/github-issues.md`
- [ ] Updated team wiki (if applicable)
- [ ] Notified team of new feature
- [ ] Created demo video or screenshots (optional)

## Communication

### Internal Team
- [ ] Engineering team notified
- [ ] QA team has test plan
- [ ] Support team aware of new feature

### External (if applicable)
- [ ] Changelog updated
- [ ] Release notes published
- [ ] Users notified of new feature

## Feature Flags (Optional)

If using feature flags:
```typescript
// Enable repository mode feature
FEATURE_REPOSITORY_MODE=true

// Enable only for specific teams
FEATURE_REPOSITORY_MODE_TEAMS=team-id-1,team-id-2
```

## Success Criteria

Feature is considered successfully deployed when:
- ✅ All smoke tests pass
- ✅ No critical errors in logs
- ✅ Users can successfully create GitHub issues
- ✅ Repository validation works correctly
- ✅ Analytics events are being tracked
- ✅ Documentation is complete and accurate

## Sign-Off

- [ ] Engineering Lead: __________________ Date: __________
- [ ] QA Lead: __________________ Date: __________
- [ ] Product Owner: __________________ Date: __________

## Notes

(Add any deployment-specific notes, issues encountered, or lessons learned)

---

**Last Updated:** 2025-09-30
**Version:** 1.0
**Feature:** Dual Repository Mode (Issue-Only + PR Mode)

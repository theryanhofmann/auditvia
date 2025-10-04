# Enterprise Scan Gating - Rollout Plan

**Version**: 1.0
**Created**: 2025-10-04
**Status**: Phase 1 - Planning
**Owner**: Engineering Lead

---

## Overview

This document defines the **rollout strategy** for Enterprise Scan Gating feature, breaking implementation into **5 atomic PRs** that can be reviewed, tested, and deployed independently.

**References**:
- Product Spec: [enterprise-scan-gate.md](../product/enterprise-scan-gate.md)
- Tech Spec: [scan-profiles-spec.md](../tech/scan-profiles-spec.md)
- SOP: [prompt-standards.md](./prompt-standards.md)

---

## Branch Naming Convention

All feature branches follow pattern:
```
feat/scan-profiles-{phase-name}
```

Examples:
- `feat/scan-profiles-foundation`
- `feat/scan-profiles-detection`
- `feat/scan-profiles-enforcement`
- `feat/scan-profiles-modal-ui`
- `feat/scan-profiles-coverage-ui`

---

## PR Breakdown

### PR #1: Profiles & Budgets Foundation ⚡️

**Branch**: `feat/scan-profiles-foundation`
**Estimated Size**: ~250 lines
**Dependencies**: None
**Merge Target**: `main`

#### Scope

Create foundational types, constants, and selection logic WITHOUT touching existing scan flow.

**Files Created**:
- `src/types/scan-profiles.ts` - Type definitions
- `src/lib/scan-profiles.ts` - Profile selection logic
- `src/lib/feature-flags.ts` - Feature flag helpers
- `__tests__/scan-profiles.test.ts` - Unit tests

**Files Modified**:
- `CHANGELOG.md` - Document changes

**NOT in Scope**:
- ❌ Crawler modifications
- ❌ UI changes
- ❌ Database migrations

#### Acceptance Criteria

- [ ] All types defined per tech spec
- [ ] `PROFILE_BUDGETS` constant exported
- [ ] `selectScanProfile()` function tested
- [ ] `canUseProfile()` permission check tested
- [ ] Feature flags defined
- [ ] Unit tests pass with >85% coverage
- [ ] Type checking passes
- [ ] Linting passes
- [ ] Build succeeds
- [ ] CHANGELOG.md updated

#### Testing Plan

```bash
# Run tests
pnpm test __tests__/scan-profiles.test.ts

# Type check
pnpm run type-check

# Lint
pnpm run lint

# Build
pnpm run build
```

**Manual Testing**: N/A (no user-facing changes)

---

### PR #2: Enterprise Detection Logic 🔍

**Branch**: `feat/scan-profiles-detection`
**Estimated Size**: ~300 lines
**Dependencies**: PR #1 merged
**Merge Target**: `main`

#### Scope

Implement enterprise site detection WITHOUT enforcement. Detection logic is testable in isolation.

**Files Created**:
- `src/lib/enterprise-detection.ts` - Detection algorithm
- `__tests__/enterprise-detection.test.ts` - Unit tests

**Files Modified**:
- `CHANGELOG.md`

**NOT in Scope**:
- ❌ Crawler integration
- ❌ UI changes
- ❌ Actual scan stopping

#### Acceptance Criteria

- [ ] `detectEnterpriseSite()` function implemented
- [ ] Sitemap size detection works
- [ ] URL discovery detection works
- [ ] Time + growth heuristic works
- [ ] Unit tests cover all detection paths
- [ ] Edge cases tested (no sitemap, small sites, etc.)
- [ ] Unit tests pass with >85% coverage
- [ ] Type checking passes
- [ ] Linting passes
- [ ] CHANGELOG.md updated

#### Testing Plan

```bash
# Run tests
pnpm test __tests__/enterprise-detection.test.ts

# Type check
pnpm run type-check

# Lint
pnpm run lint
```

**Test Cases**:
- ✅ Sitemap with 200 URLs → enterprise detected
- ✅ 180 URLs discovered → enterprise detected
- ✅ 6 min elapsed + 60 frontier → enterprise detected
- ✅ 50 URLs, 2 min → NOT enterprise
- ✅ No sitemap, 100 URLs → NOT enterprise (below threshold)

---

### PR #3: Budget Enforcement in Crawler 🚧

**Branch**: `feat/scan-profiles-enforcement`
**Estimated Size**: ~400 lines
**Dependencies**: PR #1, PR #2 merged
**Merge Target**: `main`

#### Scope

Integrate profile budgets and enterprise detection into `pageCrawler.ts`. Add database migration.

**Files Created**:
- `supabase/migrations/NNNN_add_scan_profiles.sql` - DB schema
- `__tests__/crawler-budgets.test.ts` - Integration tests

**Files Modified**:
- `scripts/crawler/pageCrawler.ts` - Budget enforcement
- `scripts/runA11yScan.ts` - Pass profile to crawler
- `src/lib/telemetry.ts` - Add telemetry event
- `CHANGELOG.md`

**NOT in Scope**:
- ❌ UI changes
- ❌ Modal or banner components

#### Acceptance Criteria

- [ ] `crawlWithBudget()` function enforces `maxUrls`
- [ ] `crawlWithBudget()` enforces `maxDuration`
- [ ] Enterprise detection called during crawl
- [ ] `CoverageSummary` generated on scan stop
- [ ] Priority queue sorting implemented
- [ ] Sitemap-first loading works
- [ ] Telemetry event emitted
- [ ] Database migration applies cleanly
- [ ] Feature flag gates new behavior
- [ ] Integration tests pass
- [ ] Unit tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] CHANGELOG.md updated

#### Testing Plan

```bash
# Apply migration locally
supabase db reset

# Run integration tests
pnpm test __tests__/crawler-budgets.test.ts

# Run all tests
pnpm test

# Type check
pnpm run type-check

# Lint
pnpm run lint

# Smoke test (manual)
NEXT_PUBLIC_FEATURE_SCAN_PROFILES=true pnpm run dev
# Navigate to dashboard, trigger scan, verify budget stops crawl
```

**Manual Test Cases**:
- ✅ Small site (25 pages) → QUICK profile, complete scan
- ✅ Medium site (100 pages) → SMART profile, complete or sampled
- ✅ Large site (200+ pages) → SMART profile, stops at 150 URLs
- ✅ Check DB: `profile`, `scanned_urls`, `coverage_percent` populated

---

### PR #4: Enterprise Detection Modal UI 💰

**Branch**: `feat/scan-profiles-modal-ui`
**Estimated Size**: ~350 lines
**Dependencies**: PR #3 merged
**Merge Target**: `main`

#### Scope

Create modal component that displays when enterprise site detected. Wire up upgrade CTAs.

**Files Created**:
- `src/app/components/scan/EnterpriseDetectionModal.tsx` - Modal component
- `__tests__/components/EnterpriseDetectionModal.test.tsx` - Component tests

**Files Modified**:
- `src/app/components/scan/AnimatedScanModal.tsx` - Integrate modal
- `src/app/api/scan/route.ts` - Return enterprise detection in response
- `CHANGELOG.md`

**NOT in Scope**:
- ❌ Coverage banner (next PR)
- ❌ Sample report filtering

#### Acceptance Criteria

- [ ] `EnterpriseDetectionModal` component created
- [ ] UX copy matches product spec exactly
- [ ] "Upgrade to Enterprise" CTA links to billing
- [ ] "View Sample Report" closes modal
- [ ] "Learn More" links to pricing page
- [ ] Modal shows estimated pages and coverage %
- [ ] Modal triggered on scan stop (enterprise detected)
- [ ] Component tests pass
- [ ] Feature flag gates modal display
- [ ] Type checking passes
- [ ] Linting passes
- [ ] CHANGELOG.md updated

#### Testing Plan

```bash
# Run component tests
pnpm test __tests__/components/EnterpriseDetectionModal.test.tsx

# Type check
pnpm run type-check

# Lint
pnpm run lint

# Manual testing
NEXT_PUBLIC_FEATURE_SCAN_PROFILES=true \
NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING=true \
pnpm run dev
```

**Manual Test Cases**:
- ✅ Trigger scan on large site → modal appears
- ✅ Modal shows correct estimated pages
- ✅ Modal shows correct scanned pages
- ✅ "Upgrade" CTA navigates to billing
- ✅ "View Report" closes modal, shows report
- ✅ Modal does NOT appear for Enterprise users
- ✅ Modal does NOT appear for small sites

---

### PR #5: Coverage Summary Banner & Sample Report 📊

**Branch**: `feat/scan-profiles-coverage-ui`
**Estimated Size**: ~400 lines
**Dependencies**: PR #4 merged
**Merge Target**: `main`

#### Scope

Add coverage summary banner to scan reports. Implement sample report filtering (top 20-50 pages).

**Files Created**:
- `src/app/components/reports/CoverageBanner.tsx` - Banner component
- `src/lib/report-filtering.ts` - Sample report logic
- `__tests__/components/CoverageBanner.test.tsx` - Component tests
- `__tests__/e2e/scan-profiles.test.ts` - E2E smoke test

**Files Modified**:
- `src/app/dashboard/scans/[scanId]/ScanReportClient.tsx` - Integrate banner
- `src/app/dashboard/scans/[scanId]/page.tsx` - Filter sample report
- `CHANGELOG.md`

**NOT in Scope**:
- ❌ Advanced report filtering (future)

#### Acceptance Criteria

- [ ] `CoverageBanner` component created
- [ ] Banner displays for QUICK profile (complete)
- [ ] Banner displays for SMART profile (partial)
- [ ] Banner displays for enterprise detected
- [ ] "Upgrade to Enterprise" CTA in banner
- [ ] Sample report filters to top 20-50 pages by priority
- [ ] Full report shown for complete scans
- [ ] Component tests pass
- [ ] E2E smoke test passes
- [ ] Feature flag gates banner display
- [ ] Type checking passes
- [ ] Linting passes
- [ ] CHANGELOG.md updated

#### Testing Plan

```bash
# Run component tests
pnpm test __tests__/components/CoverageBanner.test.tsx

# Run E2E test
pnpm run test:e2e

# Type check
pnpm run type-check

# Lint
pnpm run lint

# Smoke test
pnpm run smoke-test
```

**Manual Test Cases**:
- ✅ Small site → Green banner "Complete Scan"
- ✅ Medium site (partial) → Amber banner "Priority Sampling"
- ✅ Large site (enterprise) → Blue banner "Enterprise Site Detected"
- ✅ Enterprise user + large site → Green banner "Enterprise Deep Scan"
- ✅ Sample report shows only top pages
- ✅ Full report shows all pages

---

## Testing Strategy

### Unit Tests

**Coverage Target**: >85% for all new code

**Files**:
- `__tests__/scan-profiles.test.ts`
- `__tests__/enterprise-detection.test.ts`
- `__tests__/crawler-budgets.test.ts`
- `__tests__/components/*.test.tsx`

**Run**:
```bash
pnpm test
```

---

### Integration Tests

**Scope**: Crawler budget enforcement, DB schema, API integration

**Files**:
- `__tests__/crawler-budgets.test.ts`

**Setup**:
```bash
supabase stop
supabase start
supabase db reset
```

**Run**:
```bash
pnpm run test:integration
```

---

### E2E Tests

**Scope**: Full scan flow with profiles

**Files**:
- `__tests__/e2e/scan-profiles.test.ts`

**Run**:
```bash
pnpm run test:e2e
```

---

### Smoke Tests

**Scope**: End-to-end feature validation

**Command**:
```bash
NEXT_PUBLIC_FEATURE_SCAN_PROFILES=true \
NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING=true \
pnpm run smoke-test
```

**Validates**:
- ✅ QUICK profile for small sites
- ✅ SMART profile for medium sites
- ✅ Enterprise detection for large sites
- ✅ Coverage summary displayed
- ✅ No errors in logs

---

## Staging Verification

### Setup

1. **Deploy to staging**:
   ```bash
   vercel deploy --env=staging
   ```

2. **Enable feature flags** in Vercel environment:
   ```
   NEXT_PUBLIC_FEATURE_SCAN_PROFILES=true
   NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING=true
   ```

3. **Apply database migration**:
   ```bash
   supabase db push --include-all
   ```

---

### Test Scenarios

#### Scenario 1: SMB Site (Free Tier)

**Test Site**: Small site with 20-30 pages

**Expected**:
- ✅ Scan completes in 2-3 minutes
- ✅ Profile: QUICK
- ✅ Coverage: 100%
- ✅ Banner: "Complete Scan"
- ✅ No enterprise modal

**Verify**:
```sql
SELECT profile, scanned_urls, coverage_percent, stop_reason
FROM scans
WHERE id = '{scan_id}';
```

---

#### Scenario 2: Mid-Size Site (Pro Tier)

**Test Site**: Site with 80-120 pages

**Expected**:
- ✅ Scan completes in 5-8 minutes
- ✅ Profile: SMART
- ✅ Coverage: 70-100% (depending on discovery)
- ✅ Banner: "Smart Scan - Priority Sampling" OR "Complete Scan"
- ✅ No enterprise modal (under threshold)

**Verify**:
```sql
SELECT profile, scanned_urls, estimated_total_urls, coverage_percent, stop_reason
FROM scans
WHERE id = '{scan_id}';
```

---

#### Scenario 3: Enterprise Site (Free/Pro Tier) - Upsell

**Test Site**: Large site with 200+ pages

**Expected**:
- ✅ Scan stops at ~150 URLs or 10 min
- ✅ Profile: SMART
- ✅ Enterprise detected: TRUE
- ✅ Modal appears: "Enterprise Site Detected"
- ✅ Banner: "Sample Report - Enterprise Site Detected"
- ✅ Report shows top 20-50 pages only
- ✅ Upgrade CTA visible

**Verify**:
```sql
SELECT profile, scanned_urls, estimated_total_urls, enterprise_detected, stop_reason
FROM scans
WHERE id = '{scan_id}';
```

Expected result:
```
profile: SMART
scanned_urls: ~150
estimated_total_urls: ~300+
enterprise_detected: true
stop_reason: enterprise_detected
```

---

#### Scenario 4: Enterprise Site (Enterprise Tier)

**Test Site**: Large site with 200+ pages

**Expected**:
- ✅ Scan completes fully (or up to 1000 URLs)
- ✅ Profile: DEEP
- ✅ Coverage: 90-100%
- ✅ Banner: "Enterprise Deep Scan"
- ✅ No enterprise modal
- ✅ Full report shown

**Verify**:
```sql
SELECT profile, scanned_urls, estimated_total_urls, coverage_percent, stop_reason
FROM scans
WHERE id = '{scan_id}';
```

---

### Telemetry Verification

Check that `crawl.summary.v1` events are emitted:

```javascript
// Check browser console or analytics dashboard
// Should see events like:
{
  event: 'crawl.summary.v1',
  profile: 'SMART',
  scanned_urls: 150,
  estimated_total_urls: 300,
  coverage_percent: 50,
  stop_reason: 'enterprise_detected',
  enterprise_detected: true,
  ...
}
```

---

## Migration Steps

### Local Development

```bash
# 1. Pull latest main
git checkout main
git pull origin main

# 2. Apply migration
supabase db reset

# 3. Verify migration
supabase db diff --schema public
# Should show new columns in scans table

# 4. Start dev server with flags
NEXT_PUBLIC_FEATURE_SCAN_PROFILES=true \
NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING=true \
pnpm run dev
```

---

### Staging Environment

```bash
# 1. Deploy code to staging
vercel deploy --env=staging

# 2. Apply migration
supabase link --project-ref {staging-project-ref}
supabase db push --include-all

# 3. Verify migration
supabase db diff --schema public

# 4. Set environment variables in Vercel
# NEXT_PUBLIC_FEATURE_SCAN_PROFILES=true
# NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING=true

# 5. Redeploy to pick up env vars
vercel deploy --env=staging
```

---

### Production Environment

```bash
# 1. Merge all PRs to main
git checkout main
git pull origin main

# 2. Deploy to production
vercel deploy --prod

# 3. Apply migration with backup
# In Supabase dashboard:
#   - Create manual backup
#   - Run migration SQL
#   - Verify no errors

# 4. Enable feature flags gradually
# Start with NEXT_PUBLIC_FEATURE_SCAN_PROFILES=false
# Test manually, then flip to true

# 5. Monitor for 24h
# - Check error rates
# - Verify telemetry flowing
# - Watch for user feedback
```

---

## Rollback Plan

### If Issue Detected in Staging

1. **Disable feature flags**:
   ```bash
   # In Vercel dashboard, set:
   NEXT_PUBLIC_FEATURE_SCAN_PROFILES=false
   NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING=false
   ```

2. **Redeploy without flags**:
   ```bash
   vercel deploy --env=staging
   ```

3. **Investigate and fix**:
   - Check logs
   - Review failing test
   - Create hotfix PR
   - Re-test before re-enabling

---

### If Issue Detected in Production

1. **IMMEDIATE: Disable feature flags**:
   ```bash
   # Vercel dashboard → Environment Variables
   NEXT_PUBLIC_FEATURE_SCAN_PROFILES=false
   NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING=false
   ```

2. **Redeploy to apply**:
   ```bash
   vercel deploy --prod
   ```

3. **Rollback migration if needed**:
   ```sql
   -- If migration causes errors, rollback columns:
   ALTER TABLE scans
   DROP COLUMN IF EXISTS profile,
   DROP COLUMN IF EXISTS scanned_urls,
   DROP COLUMN IF EXISTS estimated_total_urls,
   DROP COLUMN IF EXISTS coverage_percent,
   DROP COLUMN IF EXISTS stop_reason,
   DROP COLUMN IF EXISTS enterprise_detected;
   ```

4. **Post-incident**:
   - Document root cause
   - Create hotfix PR
   - Re-test in staging
   - Gradual re-rollout

---

## Metrics to Monitor

### Application Metrics

**During Rollout (24h)**:
- ✅ Error rate (should not increase)
- ✅ API response times (should not degrade)
- ✅ Scan completion rate (should maintain >90%)
- ✅ Average scan duration (should decrease)

**Dashboards**:
- Vercel Analytics
- Supabase Dashboard → Performance
- Custom telemetry dashboard (if available)

---

### Business Metrics

**Week 1 Post-Launch**:
- 📊 Enterprise upgrade conversions (target >5%)
- 📊 User feedback (NPS, support tickets)
- 📊 Scan abandonment rate (should decrease)

**Week 2-4**:
- 📈 Enterprise tier growth (target +20% MoM)
- 📈 Server cost per scan (target -30%)
- 📈 User satisfaction scores

---

### Telemetry Queries

**Check profile distribution**:
```sql
SELECT
  profile,
  COUNT(*) as scans,
  AVG(coverage_percent) as avg_coverage,
  AVG(scanned_urls) as avg_scanned
FROM scans
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY profile;
```

**Check enterprise detections**:
```sql
SELECT
  COUNT(*) as total_enterprise_detections,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(scanned_urls) as avg_scanned_before_detection
FROM scans
WHERE enterprise_detected = TRUE
  AND created_at > NOW() - INTERVAL '7 days';
```

---

## Success Criteria

### Technical Success

- ✅ All 5 PRs merged
- ✅ All tests passing (unit, integration, E2E)
- ✅ Type checking clean
- ✅ Linting clean
- ✅ No errors in staging logs (24h)
- ✅ No errors in production logs (24h)
- ✅ Database migration applied cleanly
- ✅ Feature flags working as expected
- ✅ Telemetry data flowing

### Product Success

- ✅ SMB scans unchanged (maintain UX)
- ✅ Enterprise sites detected accurately (>95%)
- ✅ Upgrade modal shown to non-enterprise users
- ✅ Coverage summary displayed correctly
- ✅ No user complaints about broken scans
- ✅ >5% upgrade conversion in week 1
- ✅ Average scan time <8 min (down from 15+)

---

## Timeline

**Estimated Duration**: 2 weeks (10 business days)

| PR | Days | Cumulative |
|----|------|------------|
| PR #1: Foundation | 1-2 days | Day 2 |
| PR #2: Detection | 1-2 days | Day 4 |
| PR #3: Enforcement | 2-3 days | Day 7 |
| PR #4: Modal UI | 1-2 days | Day 9 |
| PR #5: Coverage UI | 1-2 days | Day 11 |
| **Staging QA** | 1-2 days | Day 13 |
| **Production Deploy** | 0.5 day | Day 13.5 |
| **Monitoring** | 1 day | Day 14.5 |

**Total**: ~2.5 weeks including monitoring

---

## Revision History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2025-10-04 | Initial rollout plan             |


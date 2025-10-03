# Urgent Routing & Display Issues Found

## Issue 1: Overview Dashboard Not Rendering ✅ FIXED

**Problem**: The main dashboard page (`/dashboard`) was rendering `WelcomeDashboard` instead of `OverviewDashboard`

**Fix Applied**: Updated `src/app/dashboard/page.tsx` to import and render `OverviewDashboard` with `teamId` and `sites` props

```typescript
// Before
import { WelcomeDashboard } from './WelcomeDashboard'
<WelcomeDashboard />

// After
import { OverviewDashboard } from '@/app/components/dashboard/OverviewDashboard'
<OverviewDashboard teamId={teamId} sites={sites} />
```

---

## Issue 2: Duplicate ScanHistoryClient Components

**Problem**: There are TWO different ScanHistoryClient components:
1. `/dashboard/sites/[siteId]/ScanHistoryClient.tsx` (OLD - not updated)
2. `/dashboard/sites/[siteId]/history/ScanHistoryClient.tsx` (NEW - updated with verdicts)

**Routes**:
- `/dashboard/sites/[siteId]` → Uses OLD component (no verdicts)
- `/dashboard/sites/[siteId]/history` → Uses NEW component (has verdicts)

**User Journey**:
1. User clicks "View Scans" button on sites page
2. Button routes to `/dashboard/sites/${site.id}/history` ← This should work!
3. BUT if route 404s, user sees nothing

**Potential Fix Options**:

### Option A: Update the OLD component (Quick Fix)
Update `/dashboard/sites/[siteId]/ScanHistoryClient.tsx` with the same verdict logic

### Option B: Consolidate Routes (Cleaner)
- Delete `/dashboard/sites/[siteId]/page.tsx` 
- Make `/history` the canonical scan history route
- Or vice versa

### Option C: Redirect (Simplest)
Make `/dashboard/sites/[siteId]/page.tsx` redirect to `/dashboard/sites/[siteId]/history`

---

## Issue 3: Analytics Page Not Showing Changes

**Problem**: Analytics was updated but user not seeing changes

**Possible Causes**:
1. API `/api/analytics/kpis` doesn't return the new data structure
2. Browser cache
3. Next.js build cache

**Data Requirements**:

The Analytics page expects this data structure from `/api/analytics/kpis`:

```typescript
{
  compliantSites: {
    value: number,        // e.g., 12
    delta: number,        // e.g., 8.3 (%)
    sparklineData: number[] // e.g., [8, 9, 10, 11, 12]
  },
  atRiskSites: {
    value: number         // e.g., 3
  },
  nonCompliantSites: {
    value: number         // e.g., 1
  },
  // ... other KPIs
}
```

**Check if API exists**:
Does `/api/analytics/kpis` exist and return this structure?

---

## Issue 4: 90% of Buttons Lead to 404

**This suggests broader routing issues**. Common causes:

1. **Next.js App Router** vs Pages Router mismatch
2. **Dynamic routes** not configured properly
3. **Missing page.tsx files** in route directories
4. **Build/deployment issues** - routes work locally but not in production

**Immediate Action**: Check browser console for:
- 404 errors with specific route paths
- Next.js routing errors
- Missing file errors

---

## Recommended Action Plan

### Immediate (Next 10 minutes):

1. **Clear browser cache** and hard reload (Cmd+Shift+R)
2. **Check if pages exist**:
   ```bash
   ls src/app/dashboard/sites/[siteId]/history/
   ls src/app/dashboard/analytics/
   ls src/app/dashboard/reports/
   ```

3. **Fix routing conflicts**: Update the OLD ScanHistoryClient or consolidate routes

4. **Verify API endpoints exist**:
   ```bash
   ls src/app/api/analytics/kpis/
   ls src/app/api/sites/
   ```

### Next (30 minutes):

5. **Test actual routes** in browser:
   - `/dashboard` - Should show OverviewDashboard with verdicts
   - `/dashboard/analytics` - Should show Analytics with compliance status
   - `/dashboard/sites/[actual-site-id]/history` - Should show scan history with verdicts

6. **Add debug logging** to confirm:
   - OverviewDashboard is mounting
   - Verdict calculation is running
   - Data is being fetched from APIs

### If Still Broken:

7. **Create new minimal test pages** to isolate the issue:
   - Create `/dashboard/test` page that just renders "TEST"
   - Create `/dashboard/test-verdict` page that renders a hardcoded verdict pill
   - If these work, the issue is in the component logic, not routing

---

## Quick Diagnostic Commands

```typescript
// Add to OverviewDashboard render
console.log('🎯 [OverviewDashboard] RENDERING', { teamId, sitesCount: sites?.length })

// Add to Analytics KPI render
console.log('📊 [Analytics KPI]', { kpis: kpis.map(k => ({ id: k.id, value: k.value })) })

// Add to ScanHistoryClient render  
console.log('📋 [ScanHistory] RENDERING', { scansCount: scans.length, firstScan: scans[0] })
```

---

## Files That Need Immediate Attention

1. ✅ `/src/app/dashboard/page.tsx` - **FIXED** - Now uses OverviewDashboard
2. ⚠️ `/src/app/dashboard/sites/[siteId]/page.tsx` - Needs to use updated component or redirect
3. ⚠️ `/src/app/dashboard/sites/[siteId]/ScanHistoryClient.tsx` - Needs verdict update OR deletion
4. ⚠️ `/src/app/api/analytics/kpis/route.ts` - Check if it exists and returns correct structure

---

## Expected vs Actual

### Expected After Changes:
- Overview shows "✅ Compliant" instead of "Score 94%"
- Scan history shows verdicts with severity badges
- Analytics shows "12 Compliant" instead of "87.3%"

### User Reports:
- Overview looks the same (WelcomeDashboard was rendering)
- View scans → 404 (route conflict)
- Analytics looks the same (data structure mismatch or cache)
- 90% buttons → 404 (broader routing issues)

This suggests the changes are correct but not being executed due to routing/caching issues.


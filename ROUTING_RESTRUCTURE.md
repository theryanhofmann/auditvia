# Routing Restructure - Scan Reports

**Date:** October 2, 2025  
**Status:** ✅ Completed

## Problem

The application had two different pages under the same "Reports" sidebar section:
1. `/dashboard/reports` - Analytics dashboard (aggregate view of all scans)
2. `/dashboard/reports/[scanId]` - Individual scan report (detailed report with AI chatbot)

This created navigation confusion as users couldn't distinguish between the analytics dashboard and individual scan reports.

## Solution

Separated individual scan reports into a dedicated route structure:

### New URL Structure

```
/dashboard/sites                        → List all sites
/dashboard/sites/[siteId]/history       → Scan history for a specific site
/dashboard/scans/[scanId]              → Individual scan report (with AI Engineer)
/dashboard/reports                      → Analytics dashboard (aggregate data)
```

### Benefits

1. **Clear Navigation Hierarchy**
   - Sites → individual site management
   - Scans → detailed scan reports with AI assistance
   - Reports → analytics and aggregate data

2. **Intuitive User Flow**
   - Sites page → "View Report" button → Latest scan report
   - Scan report has breadcrumb: Sites → [Site Name] → Scan Report

3. **Better Content Organization**
   - Analytics dashboards are separate from detailed reports
   - AI Engineer chatbot is clearly associated with individual scans
   - Platform detection and auto-fix features are scoped to specific scans

## Files Changed

### Routes Moved
- `src/app/dashboard/reports/[scanId]/*` → `src/app/dashboard/scans/[scanId]/*`

### Updated References (26 files)
- Site pages: `sites/page.tsx`, `sites/[siteId]/history/ScanHistoryClient.tsx`
- Scan components: `AnimatedScanModal.tsx`, `ScanRunningPage.tsx`, `ScanStuckPage.tsx`, `ScanFailedPage.tsx`
- UI components: `SiteCard.tsx`, `AddSiteModal.tsx`, `SitesTable.tsx`, `ScanHistory.tsx`
- Report components: `IssueDetailPanel.tsx`
- API routes: `api/notifications/route.ts`, `api/github/create-issue/route.ts`, `api/scans/[scanId]/tickets/route.ts`

### Bug Fixes
- Fixed `src/app/api/health/db/route.ts` - await `createClient()` call

## User Impact

**Before:**
- Click "Reports" tab → confusing mix of analytics and scan reports
- Click "View Report" → lands on same "Reports" tab but different page

**After:**
- Click "Reports" tab → clean analytics dashboard
- Click "View Report" → goes to `/dashboard/scans/[scanId]` (individual scan)
- Clear breadcrumb navigation shows: Sites → [Site Name] → Scan Report

## Testing Checklist

- [x] All `/dashboard/reports/[scanId]` links updated to `/dashboard/scans/[scanId]`
- [x] Site card "View Report" button navigates correctly
- [x] Scan history "View Report" button navigates correctly
- [x] Email links point to new URLs
- [x] GitHub issue links point to new URLs
- [x] Notification links point to new URLs
- [x] Breadcrumb navigation is accurate
- [x] No linter errors
- [x] All imports resolved correctly

## Rollback Plan

If issues arise, revert by:
1. Moving `src/app/dashboard/scans/[scanId]` back to `src/app/dashboard/reports/[scanId]`
2. Running: `git revert <commit-hash>`

## Future Considerations

- Consider adding a "Scans" section to the sidebar for direct access to recent scans
- Add search/filter capability for finding specific scan reports
- Implement scan comparison features at `/dashboard/scans/compare`


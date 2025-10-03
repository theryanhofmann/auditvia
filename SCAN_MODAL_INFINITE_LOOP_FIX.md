# Scan Modal Infinite Loop Fix

## Problem

The `AnimatedScanModal` was stuck in an infinite rendering loop when viewing a scan. The console showed hundreds of repeated log messages:

```
🎬 [ScanRunningPage] Rendering AnimatedScanModal {scanId: '...', siteUrl: '...'}
```

Even though the scan completed successfully (as shown in terminal logs), the frontend never detected the completion and kept polling indefinitely.

## Root Causes

### 1. **Next.js Caching Issue**
The scan report page (`/dashboard/scans/[scanId]/page.tsx`) was caching the scan status, so even though the database was updated to `status: 'completed'`, subsequent page refreshes kept returning the cached `status: 'running'`.

### 2. **Modal Not Polling**
The `AnimatedScanModal` only fetched scan results **once** (3 seconds after opening). If the scan was still running at that point, it would never check again, leaving the scanning animation running forever.

### 3. **API Response Mismatch**
The `/api/scans/[scanId]/issues` endpoint returned `{ success: true, issues: [...] }`, but the modal was checking for both `data.issues` AND `data.totalIssues`, which was never present.

## Solution

### 1. **Force Dynamic Rendering** (`page.tsx`)
Added cache-busting directives to ensure the scan status is always fetched fresh:

```typescript
// Force dynamic rendering - never cache this page
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

This ensures that when `ScanRunningPage` calls `router.refresh()`, it gets the latest data from the database.

### 2. **Add Polling to Modal** (`AnimatedScanModal.tsx`)
Changed the modal from a single fetch to continuous polling:

```typescript
// Poll for scan completion
const checkScanStatus = async () => {
  const response = await fetch(`/api/scans/${scanId}/issues`)
  
  if (response.ok) {
    const data = await response.json()
    
    // Check if scan is complete
    if (data.issues !== undefined && data.totalIssues !== undefined) {
      // Stop polling and show results
      clearInterval(pollInterval)
      // ... process and display results
    }
  }
}

// Start polling after 2s delay, then every 2s
setTimeout(() => {
  checkScanStatus()
  pollInterval = setInterval(checkScanStatus, 2000)
}, 2000)
```

### 3. **Update API Endpoint** (`/api/scans/[scanId]/issues/route.ts`)
Enhanced the endpoint to:
- Return `202 Accepted` with `pending: true` when scan is still running
- Return full scan data including `totalIssues` when completed

```typescript
// If scan is not completed, return early with pending status
if (scan.status !== 'completed') {
  return NextResponse.json({ 
    success: false, 
    pending: true,
    status: scan.status,
    message: 'Scan not yet completed'
  }, { status: 202 })
}

// Return full data when completed
return NextResponse.json({
  success: true,
  scanId: scan.id,
  siteId: scan.site_id,
  siteName: (scan.sites as any).name,
  siteUrl: (scan.sites as any).url,
  status: scan.status,
  totalIssues: scan.total_violations || 0,
  issues: issues || []
})
```

## Expected Flow Now

1. **Scan Starts** → User sees `AnimatedScanModal` with scanning animation (0-90% progress bar)
2. **Modal Polls** → Every 2 seconds, checks `/api/scans/[scanId]/issues`
   - Gets `202 Accepted` → keeps scanning animation
   - Gets `200 OK` with issues → stops polling, shows results
3. **Results Displayed** → Modal shows verdict, issue categories, and "View Full Report" button
4. **User Clicks Button** → Navigates to full `EnterpriseReportClient` report page

## Testing

To verify the fix works:

1. Add a new site and trigger a scan
2. Watch the animated modal during scanning
3. Confirm the modal transitions smoothly to showing results when scan completes
4. Check console logs for `✅ [AnimatedScanModal] Scan completed, processing results...`
5. Verify no infinite rendering loop (should not see hundreds of render logs)

## Files Changed

- `/src/app/dashboard/scans/[scanId]/page.tsx` - Added cache-busting
- `/src/app/components/scan/AnimatedScanModal.tsx` - Added polling logic
- `/src/app/api/scans/[scanId]/issues/route.ts` - Enhanced response format

## Related Issues

- Fixes: Infinite rendering loop during scan
- Fixes: Modal stuck on "Scanning..." even after completion
- Fixes: Stale cached data preventing completion detection


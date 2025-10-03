# View Scans 404 Debugging Guide

## Current Status: IN PROGRESS 🔄

The "View Scans" button is still leading to a 404 error. Here's what we've done and what to check next.

---

## What We've Fixed So Far:

### ✅ 1. Added teamId to the Link
**File**: `src/app/dashboard/sites/page.tsx` (line ~149)
```typescript
<Link
  href={`/dashboard/sites/${site.id}${teamId ? `?teamId=${teamId}` : ''}`}
  className="..."
>
  View Scans
</Link>
```

### ✅ 2. Added Debug Logging
**File**: `src/app/dashboard/sites/page.tsx` (line ~16)
```typescript
console.log('🏠 [SitesPage] teamId:', teamId, 'teamLoading:', teamLoading)
```

### ✅ 3. Added Team Loading State
Now waits for both `isLoading` and `teamLoading` before rendering the page.

### ✅ 4. Added Safety Check for Missing teamId
Shows a helpful error message if teamId is null.

---

## What to Check in Browser Console:

### 1. Check the Debug Log
Look for this in the console when on `/dashboard/sites`:
```
🏠 [SitesPage] teamId: <value> teamLoading: <true/false>
```

**What it means**:
- If `teamId` is `null` → TeamContext didn't load properly
- If `teamId` is a UUID string → Good! The teamId is available
- If `teamLoading` is `true` → Still loading, wait a moment
- If `teamLoading` is `false` → TeamContext finished loading

### 2. Inspect the Link HTML
In browser DevTools, inspect the "View Scans" button and check the `href`:

**Expected**:
```html
<a href="/dashboard/sites/abc123...?teamId=xyz789...">View Scans</a>
```

**Bad** (would cause 404):
```html
<a href="/dashboard/sites/abc123...">View Scans</a>
<!-- Missing ?teamId= -->
```

### 3. Check Network Tab
When you click "View Scans", look at the Network tab:
- What URL is being requested?
- Is it a 404 or a redirect?
- If redirect, where to?

---

## The Route Structure:

```
/dashboard/sites
  ├── page.tsx                    (List of sites)
  └── [siteId]/
      ├── page.tsx                (Scan history - REQUIRES teamId param!)
      ├── settings/page.tsx       (Site settings)
      ├── embed/page.tsx          (Embed code)
      └── history/page.tsx        (Old scan history route?)
```

**Important**: The `/dashboard/sites/[siteId]/page.tsx` route **REQUIRES** `?teamId=xxx` or it will redirect to `/dashboard`.

From the code (line 32-34):
```typescript
if (!teamId) {
  redirect('/dashboard')
}
```

---

## Possible Causes of 404:

### 1. **teamId is Null When Link Renders**
**Symptom**: Link has no `?teamId=` parameter  
**Fix**: Wait for TeamContext to load (already done)  
**Verify**: Check console log and link href

### 2. **Wrong Route Path**
**Symptom**: Clicking goes to non-existent route  
**Fix**: Check if there's a conflict with `/history/` subdirectory  
**Verify**: Check Network tab for exact URL

### 3. **Build/Cache Issue**
**Symptom**: Old code still running  
**Fix**: Hard refresh (Cmd+Shift+R) or restart dev server  
**Verify**: Check that debug logs appear

### 4. **TeamContext Not Working**
**Symptom**: `teamId` is always null in console log  
**Fix**: Check if TeamProvider is wrapping the page  
**Verify**: Check console log shows actual UUID

---

## Next Steps (Do These in Order):

### Step 1: Check Console Log
1. Open browser console
2. Navigate to `/dashboard/sites`
3. Look for `🏠 [SitesPage] teamId: ...` log
4. **Report back what you see**

### Step 2: Check Link HTML
1. Right-click "View Scans" button
2. Choose "Inspect Element"
3. Look at the `href` attribute
4. **Report back if it has `?teamId=...`**

### Step 3: Check Network Request
1. Open Network tab
2. Click "View Scans"
3. Look at the requested URL
4. Check the status code
5. **Report back the full URL and status**

### Step 4: Try Direct Navigation
1. Copy a site ID from the page
2. Copy your teamId from the URL bar
3. Manually navigate to: `/dashboard/sites/[siteId]?teamId=[teamId]`
4. **Report back if this works**

---

## If It Still Doesn't Work:

### Potential Fix A: Use Client-Side Navigation
```typescript
import { useRouter } from 'next/navigation'

const router = useRouter()

// Instead of Link
<button onClick={() => router.push(`/dashboard/sites/${site.id}?teamId=${teamId}`)}>
  View Scans
</button>
```

### Potential Fix B: Check for Conflicting Routes
There are TWO scan history pages:
- `/dashboard/sites/[siteId]/page.tsx` (NEW)
- `/dashboard/sites/[siteId]/history/page.tsx` (OLD?)

Maybe we should use the `/history` route instead?

### Potential Fix C: Add Middleware Logging
Add logging to `src/middleware.ts` to see if requests are being intercepted.

---

## Quick Test Command:

```bash
# Check if the route file exists
ls -la /Users/ryanhofmann/auditvia/src/app/dashboard/sites/[siteId]/page.tsx

# Check Next.js dev server output for route registration
# Look for: ○ /dashboard/sites/[siteId]
```

---

**PLEASE TEST AND REPORT**:
1. What the console log shows for `teamId`
2. What the link's `href` attribute is
3. What URL is actually requested (Network tab)
4. What error/status you see

This will help us pinpoint the exact issue! 🔍


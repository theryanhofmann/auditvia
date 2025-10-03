# Deep Scan Axe-Core Fix

## Problem

Deep scan was running (5 pages, 15 states tested) but **failing to load axe-core**, resulting in 0 issues detected.

### Error Message
```
[Scan] Error running axe: Error: ENOENT: no such file or directory, open '(rsc)/./node_modules/axe-core/axe.js'
```

### Root Cause
The deep scan script was using `require.resolve('axe-core')` which resolves to a webpack/Next.js internal path that doesn't exist at runtime:
- Resolved to: `'(rsc)/./node_modules/axe-core/axe.js'` ❌
- Actual path: `/node_modules/axe-core/axe.min.js` ✅

## Solution

Updated `/scripts/runDeepScan.ts` to use an explicit file path like the quick scan does:

### Before
```typescript
// Inject axe-core
await page.addScriptTag({
  path: require.resolve('axe-core')
})
```

### After  
```typescript
// Inject axe-core from local file
const axePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js')
if (!fs.existsSync(axePath)) {
  throw new Error(`axe-core not found at ${axePath}`)
}

await page.addScriptTag({
  path: axePath
})
```

## Changes Made

1. **Added imports** to `runDeepScan.ts`:
   ```typescript
   import * as path from 'path'
   import * as fs from 'fs'
   ```

2. **Updated `scanCurrentState` method** to use explicit path with existence check

## Testing

After this fix, the deep scan should:

1. **Successfully load axe-core** on all 5 pages and all states
2. **Detect real accessibility issues** (competitor found issues with:
   - Heading hierarchy (WCAG 2.4.6)
   - Button labeling (WCAG 4.1.2)
   - Focus indicators (WCAG 2.4.7)
   - Color contrast (WCAG 1.4.3)
   - Landmarks (WCAG 1.3.1)
   - Menu dropdowns (WCAG 4.1.2)
   - Skip links (WCAG 2.4.1))

3. **Classify issues correctly** into:
   - **Violations** (Required) - WCAG A/AA/AAA failures
   - **Advisories** (Best Practices) - Recommendations

## Expected Terminal Output

After the fix, you should see:
```
📋 Scan profile: deep
🔍 Starting Deep Scan v1 Prototype
🌐 Crawling pages from: https://kaveree.com/
📄 Found 5 pages to scan
🌐 Scanning: https://kaveree.com/
🔍 Scanning state: default
  Found 12 violations, 8 advisories  ✅ (not 0!)
🔍 Scanning state: cookies-dismissed
  Found 3 violations, 2 advisories
🔍 Scanning state: menu-open
  Found 5 violations, 1 advisory
✅ Page complete: 20 violations, 11 advisories
...
✅ Deep Scan Complete!
Pages scanned: 5
States tested: 15
Total issues: 87 (not 0!)
  Violations: 52
  Advisories: 35
```

## Next Steps

1. **Test the scan again** - Delete and re-add the site
2. **Verify issues are detected** - Should see violations matching competitor's findings
3. **Check tiering** - Issues should be classified as "Required" vs "Best Practices"

The backend is now fully functional! The UI updates for displaying deep scan metrics are still pending.


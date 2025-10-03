# Deep Scan Now Enabled by Default

## What Was Changed

**Changed the default scan mode from "quick" to "deep"** in `/src/app/api/audit/route.ts`:

### Before
```typescript
const { url, siteId, userId, waitForSelector, scanProfile = 'quick' } = await request.json()
```

### After
```typescript
const { url, siteId, userId, waitForSelector, scanProfile = 'deep' } = await request.json()
```

## What This Means

**All scans now use Deep Scan v1 by default**, which means:

### Multi-Page Scanning
- **Quick**: 1 page, 1 state (old default)
- **Standard**: 3 pages, 2 states  
- **Deep**: 5 pages, 3 states ✅ **NEW DEFAULT**

### Multi-State Testing
For each page, the scanner now tests:
1. **Initial load** - Page as it first loads
2. **Cookie dismissed** - After dismissing cookie/GDPR banners
3. **Menu open** - Primary navigation expanded
4. **Interactive components** - Modals, accordions, tabs, carousels

### Issue Tiering
Issues are now classified into two tiers:

**Tier A: Violations** (Required for compliance)
- WCAG A, AA, AAA violations
- Shown by default
- Affects compliance score

**Tier B: Advisories** (Best practices)
- Heading hierarchy issues
- Missing landmarks
- Low-confidence heuristics
- Keyboard focus concerns
- Hidden by default (toggle to show)

## Expected Results

With deep scan enabled, you should see:

1. **More issues discovered** - Up to 5 pages scanned instead of 1
2. **State-specific issues** - Issues hidden behind menus, modals, etc.
3. **"Required" vs "Best Practices"** labels on issues
4. **Summary metrics** in scan results:
   - `pages_scanned`: 1-5 pages
   - `states_tested`: 1-3 states per page
   - `violations_count`: WCAG violations (Required)
   - `advisories_count`: Best practices (Advisory)

## Database Schema

The migration `0016_deep_scan_prototype.sql` has already been applied. It added these columns:

### scans table
- `pages_scanned` INTEGER
- `states_tested` INTEGER
- `frames_scanned` INTEGER  
- `violations_count` INTEGER (Tier A)
- `advisories_count` INTEGER (Tier B)
- `scan_profile` TEXT (quick/standard/deep)
- `scan_metadata` JSONB

### issues table
- `page_url` TEXT
- `page_state` TEXT (initial_load, cookie_dismissed, menu_open, etc.)
- `tier` TEXT (violation, advisory)
- `wcag_reference` TEXT
- `requires_manual_review` BOOLEAN

### sites table
- `default_scan_profile` TEXT (defaults to 'deep')

## Testing

To verify deep scan is working:

1. **Start a new scan** - Delete your test site and re-add it
2. **Watch terminal logs** - Should see:
   ```
   📋 Scan profile: deep
   🔍 Starting Deep Scan v1 Prototype
   🌐 Crawling pages from: https://...
   📄 Testing page: https://... (state: initial_load)
   📄 Testing page: https://... (state: cookie_dismissed)
   ```
3. **Check scan results** - Should see more issues than before
4. **Verify labels** - Issues should have "Required" vs "Best Practices" tags

## Rollback

If you need to revert to quick scans:

```typescript
// In src/app/api/audit/route.ts
const { url, siteId, userId, waitForSelector, scanProfile = 'quick' } = await request.json()
```

## Next Steps

- UI will need updates to show deep scan metrics (pages/states scanned)
- Add toggle for showing/hiding "Best Practices" advisories
- Consider allowing users to select profile in settings (currently all deep)


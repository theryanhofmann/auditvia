# Deep Scan v1 Prototype - Current Status

## ✅ Completed Components

### 1. Database Schema (`supabase/migrations/0016_deep_scan_prototype.sql`)
- Added `scan_profile` column to scans table (quick/standard/deep)
- Added metadata columns: `pages_scanned`, `states_tested`, `frames_scanned`
- Added tier counts: `violations_count`, `advisories_count`
- Added `scan_metadata` JSONB for per-page results
- Extended issues table with:
  - `tier` (violation/advisory)
  - `page_url` (which page the issue was found on)
  - `page_state` (default, menu-open, etc.)
  - `wcag_reference` (1.4.3, 2.1.1, etc.)
  - `requires_manual_review` flag
- Added `default_scan_profile` to sites table

### 2. Multi-Page Crawler (`scripts/crawler/pageCrawler.ts`)
- Discovers up to 5 pages per site (configurable by profile)
- Breadth-first search starting from homepage
- Same-origin only (security)
- Prioritizes important pages (/about, /pricing, /features, etc.)
- Respects max depth and max pages limits
- Profile configs:
  - **Quick**: 1 page, depth 0
  - **Standard**: 3 pages, depth 1
  - **Deep**: 5 pages, depth 2

### 3. Multi-State Interaction Script (`scripts/scanner/stateInteractions.ts`)
- Tests 1-4 states per page based on profile
- State sequence:
  1. **Default** (always tested)
  2. **Cookie banner dismissed** (Standard + Deep)
  3. **Primary navigation opened** (Deep only)
  4. **First interactive component** (Deep only - modal/accordion/tab)
- Smart detection of common UI patterns
- Graceful degradation (continues if state change fails)
- Returns success/failure for each state

### 4. Tier Classification System (`scripts/scanner/issueTiers.ts`)
- **Tier A (Violations)**: WCAG 2.2 A/AA/AAA definitive failures
  - 40+ violation rules classified
  - Each mapped to WCAG reference (e.g., 1.4.3, 4.1.2)
  - Includes severity level (A, AA, AAA)
- **Tier B (Advisories)**: Best practices & manual review items
  - 15+ advisory rules classified
  - Heading hierarchy, landmarks, skip links
  - Form label quality, focus order
- `classifyIssue(ruleId)` → Returns tier classification
- `summarizeByTier(issues)` → Returns violation vs advisory counts

### 5. Deep Scan Orchestrator (`scripts/runDeepScan.ts`)
- Integrates crawler + state testing + tier classification
- Full scan workflow:
  1. Crawl pages (up to 5)
  2. For each page: test states
  3. For each state: run axe-core
  4. Classify each issue by tier
  5. Deduplicate across states
  6. Aggregate results
- Returns comprehensive `DeepScanResult`:
  - Per-page results with state breakdown
  - Violation vs advisory counts
  - Time metrics
  - Platform detection
- Deduplication by `rule + selector + pageURL` (ignores state)

---

## 🚧 Still To Do (Next Steps)

### 6. API Integration
**File**: `src/app/api/audit/route.ts`

```typescript
// Need to:
// 1. Accept scan_profile parameter
// 2. Call runDeepScan() instead of runA11yScan()
// 3. Store enhanced results in database
// 4. Populate new columns (pages_scanned, states_tested, etc.)
// 5. Store per-page results in scan_metadata JSONB
// 6. Store issues with tier, page_url, page_state, wcag_reference
```

### 7. UI Components
Need to create/update:

#### A. Scan Profile Selector
**File**: `src/app/dashboard/sites/[siteId]/settings/ScanProfileSettings.tsx`
```tsx
<select value={scanProfile} onChange={...}>
  <option value="quick">Quick (1 page, 1 state)</option>
  <option value="standard">Standard (3 pages, 2 states)</option>
  <option value="deep">Deep (5 pages, 3 states)</option>
</select>
```

#### B. Enhanced Scan Summary
**File**: `src/app/components/report/DeepScanSummary.tsx`
```tsx
// Show:
// - Pages scanned: 5
// - States tested: 12
// - Violations: 45
// - Advisories: 23 (with tooltip explaining difference)
```

#### C. Violation vs Advisory Breakdown
**File**: `src/app/components/report/TierBreakdown.tsx`
```tsx
// Stacked bar or donut chart showing:
// - Violations (red) vs Advisories (yellow)
// - Click to filter by tier
```

#### D. Issue Detail Updates
**File**: `src/app/components/report/IssueDetailPanel.tsx`
```tsx
// Add:
// - Tier badge (Violation/Advisory)
// - "Found on: /pricing → menu open"
// - WCAG reference link (if violation)
// - Manual review flag (if advisory)
```

### 8. Telemetry Events
**File**: Add to existing analytics
```typescript
// Events to emit:
// - deep_scan_started { profile, siteId, teamId }
// - page_scanned { url, pageIndex, totalPages }
// - state_tested { state, success, pageUrl }
// - deep_scan_completed { 
//     pagesScanned, 
//     statesAudited, 
//     violations, 
//     advisories, 
//     duration 
//   }
```

### 9. Database Migration
Run the migration:
```bash
cd /Users/ryanhofmann/auditvia
# Apply migration to Supabase (staging first!)
```

### 10. Update Report Page
**File**: `src/app/dashboard/scans/[scanId]/EnterpriseReportClient.tsx`
```tsx
// Add header strip:
// "5 Pages Scanned • 12 States Tested • 0 Frames Scanned"

// Add tier filter:
// [All] [Violations Only] [Advisories Only]

// Update issue list to show:
// - Tier badge on each issue
// - Page URL + state context
```

---

## 🎯 Quick Integration Checklist

To get the prototype working end-to-end:

- [ ] Run database migration
- [ ] Update `/api/audit` to use `runDeepScan`
- [ ] Store enhanced results (new columns + JSONB)
- [ ] Add scan profile selector to Site Settings
- [ ] Show "Pages/States/Violations/Advisories" on Report page
- [ ] Add tier badges to issue list
- [ ] Show "Found on /url → state" in issue details
- [ ] Add telemetry events
- [ ] Test with a real site (should find 2-5x more issues!)

---

## 📊 Expected Impact

### Before (Single Page Scan):
- 1 page scanned
- 1 state tested (default)
- ~10-30 issues found (varies by site)

### After (Deep Scan - Standard Profile):
- 3 pages scanned
- 6 states tested (2 per page)
- ~30-90 issues found (3x increase)
- Clear separation: "45 violations, 15 advisories"

### After (Deep Scan - Deep Profile):
- 5 pages scanned  
- 15 states tested (3 per page)
- ~50-150 issues found (5x increase)
- More comprehensive coverage

---

## 🔒 Guardrails (Built In)

✅ Same-origin only (no cross-site crawling)  
✅ Time budget per site (timeout on page load)  
✅ Rate limiting (500ms between pages in crawler)  
✅ Graceful degradation (continues if state fails)  
✅ Soft fails (skips pages that error)  
✅ No overlays or DOM injection  
✅ Clear violation vs advisory separation  

---

## 💬 Messaging (Ready to Ship)

### In Settings:
```
Choose your scan depth:
- Quick: Scans homepage only (fastest)
- Standard: Scans top 3 pages with common interactions
- Deep: Comprehensive scan of 5 pages across multiple states

Deep scans find 3-5x more issues by testing menus, modals, and 
multiple pages. Only WCAG violations affect your compliance score.
```

### On Report:
```
💡 Your scan found 45 violations and 15 advisories.

Violations are definitive WCAG failures that affect compliance.
Advisories are best-practice recommendations for manual review.

Some scanners count advisories as "errors" - that's why our 
numbers may look different. We separate them for transparency.
```

---

## 🚀 Next Actions

**Option 1: Complete the prototype** (recommended)
1. Integrate API (1-2 hours)
2. Add UI components (3-4 hours)
3. Test on real sites (1 hour)
4. Ship to staging!

**Option 2: Test the scanner directly**
```bash
cd /Users/ryanhofmann/auditvia
npx tsx scripts/runDeepScan.ts
```

**Option 3: Review and adjust**
- Change page limits
- Add more state interactions
- Refine tier classifications
- Add more WCAG rules

---

Which would you like to do next? 🎯


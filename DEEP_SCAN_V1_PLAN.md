# Deep Scan v1 — Implementation Plan

**Goal:** Close parity with accessiBe issue counts without overlays, while maintaining WCAG credibility through clear violation vs. advisory separation.

---

## Phase 1: Database Schema & Configuration (Week 1)

### 1.1 Database Migrations

**New Tables:**
```sql
-- Scan configurations
CREATE TABLE scan_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  profile_type TEXT NOT NULL CHECK (profile_type IN ('quick', 'standard', 'deep')),
  max_pages INT DEFAULT 10,
  max_depth INT DEFAULT 3,
  include_advisories BOOLEAN DEFAULT true,
  time_budget_minutes INT DEFAULT 30,
  include_patterns TEXT[], -- ['/blog/*', '/products/*']
  exclude_patterns TEXT[], -- ['/admin/*', '/api/*']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-page scan results
CREATE TABLE scan_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status_code INT,
  page_title TEXT,
  crawl_depth INT DEFAULT 0,
  states_audited TEXT[], -- ['default', 'menu-open', 'dark-theme']
  frames_scanned INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extended issue tracking with tiers and states
ALTER TABLE issues ADD COLUMN tier TEXT DEFAULT 'violation' 
  CHECK (tier IN ('violation', 'advisory', 'manual-review'));
ALTER TABLE issues ADD COLUMN page_url TEXT;
ALTER TABLE issues ADD COLUMN page_state TEXT DEFAULT 'default';
ALTER TABLE issues ADD COLUMN theme TEXT; -- 'light', 'dark', etc.
ALTER TABLE issues ADD COLUMN zoom_level TEXT; -- '100%', '200%'
ALTER TABLE issues ADD COLUMN wcag_reference TEXT; -- '1.4.3', '2.1.1'
ALTER TABLE issues ADD COLUMN requires_manual_review BOOLEAN DEFAULT false;

-- Scan metadata
ALTER TABLE scans ADD COLUMN pages_scanned INT DEFAULT 1;
ALTER TABLE scans ADD COLUMN states_audited INT DEFAULT 1;
ALTER TABLE scans ADD COLUMN frames_scanned INT DEFAULT 0;
ALTER TABLE scans ADD COLUMN violations_count INT DEFAULT 0;
ALTER TABLE scans ADD COLUMN advisories_count INT DEFAULT 0;
ALTER TABLE scans ADD COLUMN manual_review_count INT DEFAULT 0;
ALTER TABLE scans ADD COLUMN scan_profile TEXT DEFAULT 'quick';
```

### 1.2 Scan Profile UI
- Add "Scan Settings" section to Site Settings page
- Profile selector: Quick (1 page) | Standard (10 pages) | Deep (50 pages)
- Toggle: "Include Advisory Issues"
- Time budget slider
- Include/exclude pattern inputs

---

## Phase 2: Multi-Page Crawler (Week 2)

### 2.1 Sitemap Parser
**Location:** `scripts/crawler/sitemap-parser.ts`

```typescript
interface SitemapResult {
  urls: string[]
  priority: number[]
  lastmod: Date[]
}

async function parseSitemap(baseUrl: string): Promise<SitemapResult>
async function discoverSitemaps(baseUrl: string): Promise<string[]>
```

### 2.2 Link Discovery
**Location:** `scripts/crawler/link-discovery.ts`

```typescript
interface CrawlConfig {
  maxPages: number
  maxDepth: number
  sameOriginOnly: boolean
  rateLimit: number // ms between requests
  includePatterns: string[]
  excludePatterns: string[]
}

async function discoverLinks(
  page: Page,
  baseUrl: string,
  config: CrawlConfig
): Promise<string[]>
```

### 2.3 Common Path Discovery
**Location:** `scripts/crawler/common-paths.ts`

```typescript
const COMMON_PATHS = [
  '/about', '/contact', '/pricing', '/features',
  '/blog', '/services', '/products', '/faq',
  '/privacy', '/terms', '/accessibility'
]

async function checkCommonPaths(baseUrl: string): Promise<string[]>
```

### 2.4 Crawler Orchestrator
**Location:** `scripts/crawler/crawler.ts`

```typescript
interface PageToScan {
  url: string
  depth: number
  referrer?: string
}

class WebsiteCrawler {
  async crawl(
    baseUrl: string,
    config: CrawlConfig
  ): Promise<PageToScan[]>
}
```

---

## Phase 3: Multi-State DOM Audit (Week 3)

### 3.1 Interaction Script
**Location:** `scripts/scanner/dom-interactions.ts`

```typescript
interface DOMState {
  name: string
  description: string
  screenshot?: string
}

async function runInteractionSequence(
  page: Page
): Promise<DOMState[]> {
  const states: DOMState[] = []
  
  // 1. Default state
  states.push({ name: 'default', description: 'Initial page load' })
  await runAxeScan(page, 'default')
  
  // 2. Cookie banner handling
  await dismissCookieBanner(page)
  states.push({ name: 'cookies-accepted', description: 'After cookie consent' })
  
  // 3. Navigation menu
  await openPrimaryNav(page)
  states.push({ name: 'menu-open', description: 'Primary navigation expanded' })
  await runAxeScan(page, 'menu-open')
  
  // 4. Accordions/tabs
  await toggleAccordions(page)
  await toggleTabs(page)
  
  // 5. Modals
  await openModals(page)
  
  // 6. Carousels
  await advanceCarousels(page)
  
  // 7. Lazy loading
  await scrollToTriggerLazy(page)
  
  return states
}
```

### 3.2 Interaction Helpers
```typescript
async function dismissCookieBanner(page: Page): Promise<boolean>
async function openPrimaryNav(page: Page): Promise<boolean>
async function toggleAccordions(page: Page): Promise<number>
async function toggleTabs(page: Page): Promise<number>
async function openModals(page: Page): Promise<number>
async function advanceCarousels(page: Page): Promise<number>
async function scrollToTriggerLazy(page: Page): Promise<void>
```

### 3.3 State Deduplication
```typescript
interface IssueFingerprint {
  rule: string
  selector: string
  html: string
  pageUrl: string
}

function deduplicateIssues(
  issues: ScanIssue[],
  states: string[]
): ScanIssue[]
```

---

## Phase 4: Rule-Set Tiers (Week 4)

### 4.1 Rule Classification
**Location:** `scripts/scanner/rule-tiers.ts`

```typescript
interface RuleTier {
  tier: 'violation' | 'advisory' | 'manual-review'
  wcagReference?: string
  wcagLevel?: 'A' | 'AA' | 'AAA'
  requiresManualValidation: boolean
}

const RULE_TIERS: Record<string, RuleTier> = {
  // Tier A: WCAG Violations
  'color-contrast': {
    tier: 'violation',
    wcagReference: '1.4.3',
    wcagLevel: 'AA',
    requiresManualValidation: false
  },
  'image-alt': {
    tier: 'violation',
    wcagReference: '1.1.1',
    wcagLevel: 'A',
    requiresManualValidation: false
  },
  'button-name': {
    tier: 'violation',
    wcagReference: '4.1.2',
    wcagLevel: 'A',
    requiresManualValidation: false
  },
  
  // Tier B: Advisories (best practices)
  'heading-order': {
    tier: 'advisory',
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualValidation: false
  },
  'landmark-one-main': {
    tier: 'advisory',
    wcagReference: '1.3.1',
    wcagLevel: 'A',
    requiresManualValidation: false
  },
  'focus-order-semantics': {
    tier: 'advisory',
    requiresManualValidation: true
  },
  
  // Tier C: Manual Review Required
  'label-content-name-mismatch': {
    tier: 'manual-review',
    wcagReference: '2.5.3',
    wcagLevel: 'A',
    requiresManualValidation: true
  },
  'form-field-multiple-labels': {
    tier: 'manual-review',
    requiresManualValidation: true
  }
}
```

### 4.2 Axe Configuration
```typescript
const TIER_A_RULES = [
  'color-contrast',
  'image-alt',
  'button-name',
  'link-name',
  'html-has-lang',
  'valid-lang',
  'aria-*', // All WCAG A/AA ARIA rules
  // ... full WCAG 2.2 A/AA ruleset
]

const TIER_B_RULES = [
  'heading-order',
  'landmark-*',
  'region',
  'skip-link',
  // ... best practices
]

const TIER_C_RULES = [
  'label-content-name-mismatch',
  'identical-links-same-purpose',
  // ... items needing human judgment
]
```

---

## Phase 5: Frames & Shadow DOM (Week 4)

### 5.1 Frame Scanning
**Location:** `scripts/scanner/frame-scanner.ts`

```typescript
async function scanFrames(page: Page): Promise<{
  sameOrigin: number
  crossOrigin: number
  issues: ScanIssue[]
}> {
  const frames = page.frames()
  const results = {
    sameOrigin: 0,
    crossOrigin: 0,
    issues: []
  }
  
  for (const frame of frames) {
    const frameUrl = frame.url()
    if (isSameOrigin(frameUrl, page.url())) {
      results.sameOrigin++
      const frameIssues = await runAxeOnFrame(frame)
      results.issues.push(...frameIssues)
    } else {
      results.crossOrigin++
      console.log(`[Frames] Skipping cross-origin: ${frameUrl}`)
    }
  }
  
  return results
}
```

### 5.2 Shadow DOM Scanning
```typescript
async function scanShadowRoots(page: Page): Promise<ScanIssue[]>
```

---

## Phase 6: Contrast & Theme Coverage (Week 5)

### 6.1 Theme Testing
**Location:** `scripts/scanner/theme-scanner.ts`

```typescript
interface ThemeConfig {
  name: string
  mediaQuery?: string
  className?: string
  zoom?: string
}

const THEMES: ThemeConfig[] = [
  { name: 'light', mediaQuery: 'prefers-color-scheme: light' },
  { name: 'dark', mediaQuery: 'prefers-color-scheme: dark' },
  { name: 'zoom-200', zoom: '200%' }
]

async function testThemes(
  page: Page,
  themes: ThemeConfig[]
): Promise<Map<string, ScanIssue[]>>
```

### 6.2 Contrast Re-evaluation
```typescript
async function evaluateContrastAcrossThemes(
  page: Page
): Promise<ContrastResult[]>
```

---

## Phase 7: Keyboard Flow Checks (Week 5)

### 7.1 Tab Order Simulation
**Location:** `scripts/scanner/keyboard-flow.ts`

```typescript
interface FocusableElement {
  selector: string
  tagName: string
  role?: string
  tabIndex?: number
  hasVisibleOutline: boolean
  isReachable: boolean
}

async function simulateTabFlow(
  page: Page,
  maxElements = 30
): Promise<{
  elements: FocusableElement[]
  issues: string[]
}>
```

### 7.2 Focus Trap Detection
```typescript
async function detectFocusTraps(page: Page): Promise<FocusTrap[]>
```

---

## Phase 8: Reporting & UI (Week 6)

### 8.1 Enhanced Scan Summary Component
**Location:** `src/app/components/report/DeepScanSummary.tsx`

```tsx
interface DeepScanSummary {
  pagesScanned: number
  statesAudited: number
  framesScanned: number
  violations: number
  advisories: number
  manualReview: number
  profile: 'quick' | 'standard' | 'deep'
}

export function DeepScanSummaryCard({ summary }: { summary: DeepScanSummary })
```

### 8.2 Violation vs Advisory Breakdown
```tsx
export function IssueBreakdownChart({ 
  violations: number
  advisories: number
  manualReview: number
})
```

### 8.3 Per-Page Results Table
```tsx
export function PageResultsTable({ 
  pages: ScanPage[]
})
```

### 8.4 Issue Details with Context
```tsx
interface IssueContext {
  pageUrl: string
  pageState: string // "menu-open", "dark-theme", etc.
  theme?: string
  zoomLevel?: string
  tier: 'violation' | 'advisory' | 'manual-review'
}

export function IssueDetailPanel({ 
  issue: ScanIssue
  context: IssueContext
})
```

### 8.5 "Why Numbers Changed" Explainer
```tsx
export function ScanMethodologyExplainer()
```

---

## Phase 9: Scan Orchestration (Week 7)

### 9.1 Updated Scan Workflow
**Location:** `scripts/runDeepScan.ts`

```typescript
export async function runDeepScan(
  siteId: string,
  scanId: string,
  config: ScanProfileConfig
): Promise<DeepScanResult> {
  // 1. Crawl pages
  const pagesToScan = await crawler.crawl(baseUrl, config)
  
  // 2. For each page
  for (const pageInfo of pagesToScan) {
    // 3. Run interaction sequence
    const states = await runInteractionSequence(page)
    
    // 4. Test themes
    const themeResults = await testThemes(page, THEMES)
    
    // 5. Scan frames
    const frameResults = await scanFrames(page)
    
    // 6. Keyboard flow
    const keyboardResults = await simulateTabFlow(page)
    
    // 7. Aggregate and store
    await storePageResults(scanId, pageInfo, results)
  }
  
  // 8. Deduplicate and calculate aggregate
  return aggregateResults(scanId)
}
```

---

## Phase 10: API Updates (Week 7)

### 10.1 Scan Configuration Endpoint
```typescript
// POST /api/sites/:siteId/scan-profile
// GET /api/sites/:siteId/scan-profile
// PUT /api/sites/:siteId/scan-profile
```

### 10.2 Deep Scan Trigger
```typescript
// POST /api/scans/deep
// Body: { siteId, profile: 'quick' | 'standard' | 'deep' }
```

### 10.3 Per-Page Results
```typescript
// GET /api/scans/:scanId/pages
// GET /api/scans/:scanId/pages/:pageId/issues
```

---

## Acceptance Criteria Checklist

- [ ] Crawl at least 10 pages by default (configurable)
- [ ] Show per-page issue counts in report
- [ ] Detect common menu/modal/cookie interactions
- [ ] Increase issues surfaced (keyboard/focus/carousel)
- [ ] Separate "Violations" from "Advisories" in counts and charts
- [ ] Provide "Why this failed" with WCAG refs for violations
- [ ] Provide "Why this matters / how to validate" for advisories
- [ ] Scan summary shows "x pages, y states, z advisories"
- [ ] No overlays or DOM injections (scanner-only)
- [ ] Clear messaging about violation vs. advisory distinction
- [ ] Settings to enable/disable advisories
- [ ] Explainer for users seeing "lower numbers than competitors"

---

## Messaging Strategy

### In-App Messaging

**Scan Settings Page:**
```
Auditvia scans focus on WCAG-based violations as the source of truth. 
Enable "Include Advisories" below to also see best-practice items that 
some tools count as errors.
```

**Report Page (when advisories disabled):**
```
💡 Your scan focused on WCAG violations. Some scanners report higher 
numbers by including best-practice advisories. You can enable those in 
Scan Settings.
```

**Issue Detail (for advisories):**
```
📋 Advisory: This is a best-practice recommendation. While not a strict 
WCAG violation, addressing it improves accessibility.
```

**Issue Detail (for manual review):**
```
👁️ Manual Review Required: This item needs human judgment to confirm 
whether it violates WCAG standards.
```

---

## Technical Considerations

### Performance
- Rate limit: 500ms between page requests
- Max scan time: 30min default (configurable)
- Parallel processing: 3 pages max
- Timeout per page: 60s

### Error Handling
- Skip pages that timeout
- Continue crawl if individual page fails
- Store partial results
- Retry failed pages (max 2 retries)

### Storage
- Estimate: ~500 KB per page (with screenshots)
- Cleanup old page results after 90 days
- Aggregate results stored indefinitely

---

## Testing Strategy

### Unit Tests
- Sitemap parser
- Link discovery
- Rule tier classification
- Deduplication logic

### Integration Tests
- Full crawl on test sites
- Interaction sequence reliability
- Theme switching
- Frame scanning

### Parity Benchmark
- Run side-by-side with accessiBe on 10 public sites
- Compare violation counts (should be similar)
- Compare total counts (ours = violations; theirs = violations + advisories)
- Document differences

---

## Rollout Plan

### Phase 1 (Internal Beta)
- Deploy to staging
- Test on 5-10 real customer sites
- Gather feedback from team

### Phase 2 (Customer Beta)
- Invite 10 customers to opt-in
- "Deep Scan" badge in UI
- Collect feedback

### Phase 3 (General Release)
- Make "Standard" profile default for new scans
- Keep "Quick" as option
- Add upgrade prompt for "Deep" scans (Pro feature?)

---

## Future Enhancements (Phase 2)

### Auth Flows
```typescript
interface AuthConfig {
  loginUrl: string
  credentials: {
    username: string
    password: string
  }
  loginSelectors: {
    usernameField: string
    passwordField: string
    submitButton: string
  }
}
```

### Platform-Specific Heuristics
```typescript
const PLATFORM_INTERACTIONS = {
  webflow: async (page) => { /* ... */ },
  framer: async (page) => { /* ... */ },
  wordpress: async (page) => { /* ... */ }
}
```

### Scan Comparison
```typescript
interface ScanDelta {
  new: ScanIssue[]
  resolved: ScanIssue[]
  regressed: ScanIssue[]
  byTier: {
    violations: ScanDelta
    advisories: ScanDelta
    manualReview: ScanDelta
  }
}
```

---

## Timeline Summary

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Database & Config | Schema + Scan Profile UI |
| 2 | Crawler | Multi-page discovery working |
| 3 | DOM Interactions | State-based scanning |
| 4 | Rule Tiers & Frames | Tier classification + frame scanning |
| 5 | Themes & Keyboard | Multi-theme + keyboard flow |
| 6 | UI & Reporting | Enhanced report components |
| 7 | Orchestration & API | Full deep scan working |
| 8 | Testing & Polish | Beta-ready |

**Total:** ~8 weeks for v1


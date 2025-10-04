# Enterprise Scan Gating - Product Specification

**Version**: 1.0
**Created**: 2025-10-04
**Status**: Phase 1 - Specification
**Owner**: Product Team

---

## Problem Statement

### Current Behavior

Auditvia currently scans entire websites without budget limits, leading to:

1. **SMB sites (5-50 pages)** - Complete quickly, good UX ✅
2. **Mid-size sites (50-150 pages)** - Slow but acceptable (5-10 min) ⚠️
3. **Enterprise sites (150+ pages)** - Extremely slow or timeout (15-60+ min) ❌

**Issues**:
- Users abandon scans on large sites (poor conversion)
- Server costs spike on enterprise sites
- No differentiation between Free/Pro/Enterprise tiers
- No upsell mechanism for enterprise users

### Goal

Implement **smart scan gating** that:
- ✅ SMB sites → Fast, complete scans (retain current UX)
- ✅ Mid-size sites → Intelligent sampling (5-10 min max)
- ✅ Enterprise sites → Early detection + upgrade prompt (30s-2min detection)
- ✅ Enterprise tier → Full deep scans with resumability

---

## User Profiles & Use Cases

### Profile 1: SMB Owner (Free/Pro Tier)

**Site**: 15 pages, simple structure
**Expected Behavior**: Complete scan in 2-3 minutes
**Profile Applied**: `QUICK`
**Budget**:
- Max 50 URLs crawled
- 5 minutes timeout
- Full coverage expected

**Outcome**: ✅ No change from current experience

---

### Profile 2: Growth Company (Pro Tier)

**Site**: 85 pages, blog + product pages
**Expected Behavior**: Intelligent sampling in 5-8 minutes
**Profile Applied**: `SMART`
**Budget**:
- Max 150 URLs crawled
- 10 minutes timeout
- Priority-based sampling

**Outcome**:
- ✅ High-priority pages scanned (homepage, product pages)
- ✅ Sample of blog/content pages
- ℹ️  Coverage summary shown: "Scanned 150 of ~200 pages (75% coverage)"

---

### Profile 3: Enterprise Site (Free/Pro Tier - Upsell Target)

**Site**: 500+ pages, complex navigation
**Expected Behavior**: Enterprise detection + upgrade prompt
**Profile Applied**: `SMART` (attempts sampling)
**Budget**:
- Max 150 URLs crawled
- Detects enterprise at ~100-150 URLs or 5 min elapsed

**Outcome**:
- ⚠️  Scan stops at budget limit
- 📊 Shows sample report (top 20-50 pages scanned)
- 💰 Prominent upgrade CTA to Enterprise tier

---

### Profile 4: Enterprise Customer (Enterprise Tier)

**Site**: 500+ pages, complex navigation
**Expected Behavior**: Full deep scan with resumability
**Profile Applied**: `DEEP`
**Budget**:
- Max 1000 URLs crawled (future: unlimited)
- 30 minutes timeout (future: resumable)
- Full sitemap + priority crawl

**Outcome**:
- ✅ Complete coverage with intelligent prioritization
- ✅ Detailed coverage report
- 🔄 Future: Resume from checkpoint if interrupted

---

## Scan Profiles

### QUICK Profile (Default for Free/Pro <50 pages)

```typescript
{
  maxUrls: 50,
  maxDuration: 5 * 60 * 1000, // 5 minutes
  strategy: 'complete',
  sitemapFirst: true,
  priorityOrder: ['homepage', 'navigation', 'discovered']
}
```

**Triggers**:
- Site has sitemap with <50 URLs
- Manual selection by user (future)

**Behavior**:
- Crawl all pages exhaustively
- No sampling needed
- Fast turnaround

---

### SMART Profile (Default for Pro 50-150 pages)

```typescript
{
  maxUrls: 150,
  maxDuration: 10 * 60 * 1000, // 10 minutes
  strategy: 'priority-sampling',
  sitemapFirst: true,
  priorityOrder: ['homepage', 'product', 'navigation', 'content'],
  enterpriseDetectionThreshold: 150
}
```

**Triggers**:
- Site sitemap has 50-150 URLs
- Crawl discovers 50-150 pages
- Default for Pro tier

**Behavior**:
- Crawl sitemap first (if available)
- Prioritize high-value pages:
  1. Homepage
  2. Product/service pages
  3. Main navigation links
  4. Sample of content pages
- Stop at 150 URLs or 10 min
- Show coverage summary

**Enterprise Detection**:
Triggers upgrade prompt if:
- `discoveredUrls > 150` OR
- `elapsed > 5min AND frontierStillGrowing`

---

### DEEP Profile (Enterprise Tier Only)

```typescript
{
  maxUrls: 1000,
  maxDuration: 30 * 60 * 1000, // 30 minutes
  strategy: 'comprehensive',
  sitemapFirst: true,
  priorityOrder: ['homepage', 'product', 'navigation', 'content', 'utility'],
  resumable: true, // Future
  checkpointInterval: 100 // Future
}
```

**Triggers**:
- User has Enterprise entitlement
- Manual selection for Enterprise users

**Behavior**:
- Full sitemap crawl
- Priority queue for discovered URLs
- Comprehensive coverage
- Future: Checkpoint every 100 URLs for resumability

---

## Enterprise Detection Logic

### Triggers

Enterprise site detected when **ANY** of:

1. **URL Discovery**:
   - `discoveredUrls > 150` during crawl

2. **Time + Growth**:
   - `elapsedTime > 5min` AND
   - `frontier.size > 50` (still discovering new URLs)

3. **Sitemap Size**:
   - Sitemap contains `> 150` URLs

### Detection Flow

```
Start Scan
  ↓
Load Sitemap (if available)
  ↓
sitemap.urls > 150?
  YES → Mark as Enterprise Site
  NO → Continue crawl
  ↓
While crawling:
  ├─ discoveredUrls > 150? → Mark as Enterprise
  └─ elapsed > 5min AND frontier > 50? → Mark as Enterprise
  ↓
If Enterprise Detected:
  ├─ User has Enterprise tier? → Continue DEEP scan
  └─ User on Free/Pro? → Stop scan, show upgrade prompt
```

---

## UX Copy

### Enterprise Detection Modal

**Title**: 🏢 **Enterprise Site Detected**

**Body**:
> We've detected this is a large, complex website with **{estimatedPages}+ pages**.
>
> Your current scan stopped at **{scannedPages} pages** to respect your plan limits.
>
> **What you're seeing**:
> - ✅ Complete analysis of your top **{scannedPages}** priority pages
> - 📊 Sample coverage: **~{coveragePercent}%** of total site
>
> **Upgrade to Enterprise** for:
> - 🔍 Full deep scans (up to 1,000 pages)
> - 🎯 Complete site coverage with intelligent prioritization
> - 🔄 Resumable scans for maximum reliability
> - 📈 Advanced compliance forecasting

**CTAs**:
- Primary: "Upgrade to Enterprise" (links to billing)
- Secondary: "View Sample Report" (closes modal, shows partial results)
- Tertiary: "Learn More" (links to pricing page)

---

### Coverage Summary (In Report)

**Location**: Top of scan report, info banner

**QUICK Profile (Complete Coverage)**:
```
✅ Complete Scan
Analyzed all 42 pages on your site.
```

**SMART Profile (Partial Coverage)**:
```
📊 Smart Scan - Priority Sampling
Analyzed 150 of ~250 estimated pages (60% coverage)
• All high-priority pages scanned (homepage, products, navigation)
• Sample of content pages included
• Upgrade to Enterprise for 100% coverage
```

**DEEP Profile (Enterprise)**:
```
🏢 Enterprise Deep Scan
Analyzed 487 of 500 pages (97% coverage)
• Full sitemap coverage
• Comprehensive crawl with intelligent prioritization
```

---

### Sample Report Behavior

When enterprise detection stops scan early:

**What User Sees**:
1. **Enterprise detection modal** (see copy above)
2. **Partial scan report** with coverage banner
3. **Top 20-50 pages** ranked by priority:
   - Homepage (always included)
   - Product/service pages (from nav)
   - Main navigation links
   - High-priority content pages

**What User Does NOT See**:
- ❌ Low-priority content pages
- ❌ Utility pages (privacy, terms, etc.)
- ❌ Deep-nested pages beyond priority threshold

**Report Features**:
- ✅ Issue counts (for scanned pages only)
- ✅ Compliance score (with caveat: "based on sample")
- ✅ Category breakdown
- ⚠️  Prominent banner: "This is a sample report. Upgrade for complete analysis."

---

## Pricing & Entitlement

### Free Tier
- **Profiles**: QUICK, SMART (with enterprise gating)
- **Max Pages**: 150 per scan
- **Behavior**: Gets enterprise upgrade prompt

### Pro Tier
- **Profiles**: QUICK, SMART (with enterprise gating)
- **Max Pages**: 150 per scan
- **Behavior**: Gets enterprise upgrade prompt
- **Benefit**: Faster scans with smart sampling

### Enterprise Tier
- **Profiles**: QUICK, SMART, DEEP
- **Max Pages**: 1,000 per scan (future: unlimited)
- **Behavior**: No gating, full deep scans
- **Benefits**:
  - Complete site coverage
  - Priority-based crawling
  - Future: Resumable scans
  - Future: Parallel scanning

---

## Acceptance Criteria

### ✅ Phase 1: Profiles & Budgets (PR #1)

- [ ] `ScanProfile` type defined with `QUICK | SMART | DEEP`
- [ ] `ProfileBudget` interface with `maxUrls`, `maxDuration`, `strategy`
- [ ] Profile constants exported from `src/types/scan-profiles.ts`
- [ ] Unit tests for profile selection logic
- [ ] Feature flag `NEXT_PUBLIC_FEATURE_SCAN_PROFILES` created

### ✅ Phase 2: Enterprise Detection (PR #2)

- [ ] `detectEnterpriseSite()` function in `src/lib/scan-detection.ts`
- [ ] Detection logic:
  - Sitemap size check
  - URL discovery threshold
  - Time + growth heuristic
- [ ] Integration with `pageCrawler.ts`
- [ ] Unit tests for all detection paths
- [ ] Integration test for detection flow

### ✅ Phase 3: Budget Enforcement (PR #3)

- [ ] `pageCrawler.ts` respects `maxUrls` budget
- [ ] `pageCrawler.ts` respects `maxDuration` timeout
- [ ] Early stop when budget exceeded
- [ ] `CoverageSummary` telemetry event emitted
- [ ] Integration tests for budget enforcement

### ✅ Phase 4: UI - Enterprise Modal (PR #4)

- [ ] `EnterpriseDetectionModal` component
- [ ] UX copy matches spec exactly
- [ ] Modal triggered on scan stop
- [ ] "Upgrade to Enterprise" CTA wired
- [ ] "View Sample Report" closes modal
- [ ] Component tests with mocked data

### ✅ Phase 5: UI - Coverage Summary (PR #5)

- [ ] Coverage banner component
- [ ] Display logic for QUICK/SMART/DEEP profiles
- [ ] Sample report filtering (top 20-50 pages)
- [ ] "Upgrade" CTA in banner
- [ ] E2E smoke test for full flow

### ✅ Final QA

- [ ] Staging test: SMB site (complete scan, no modal)
- [ ] Staging test: Mid-size site (smart sampling, coverage banner)
- [ ] Staging test: Enterprise site (upgrade modal, sample report)
- [ ] Staging test: Enterprise user (full deep scan, no gating)
- [ ] Telemetry data flowing to analytics
- [ ] No errors in staging logs
- [ ] Production deployment successful
- [ ] Monitor for 24h post-deploy

---

## Success Metrics

**Primary KPIs**:
- **SMB scan completion rate**: Maintain >95% (no regression)
- **Enterprise upgrade conversions**: >5% of users seeing modal
- **Average scan duration**: <8 minutes (down from 15+ min)

**Secondary KPIs**:
- **Server cost per scan**: <30% reduction
- **User satisfaction**: NPS unchanged or improved
- **Enterprise tier growth**: +20% MoM after launch

---

## Future Enhancements

### v1.1: Resumable Scans (Enterprise)
- Checkpoint every 100 URLs
- Resume from last checkpoint on timeout
- UI shows progress bar with resume button

### v1.2: Parallel Scanning (Enterprise)
- Concurrent page analysis
- 2-4x faster for large sites
- Requires infrastructure upgrade

### v1.3: Custom Profiles
- Enterprise users define custom budgets
- Per-site profile overrides
- Advanced priority rules (regex, depth, etc.)

### v1.4: Unlimited Scanning (Enterprise+)
- No hard URL limits
- Distributed crawling architecture
- Multi-hour scans supported

---

## Revision History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2025-10-04 | Initial product specification    |


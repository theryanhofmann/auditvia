# Scan Profiles - Technical Specification

**Version**: 1.0
**Created**: 2025-10-04
**Status**: Phase 1 - Specification
**Owner**: Engineering Team

---

## Overview

This document defines the **technical implementation** for scan profiles (QUICK, SMART, DEEP) and enterprise detection gating.

**References**:
- Product Spec: [enterprise-scan-gate.md](../product/enterprise-scan-gate.md)
- Rollout Plan: [enterprise-gate-rollout.md](../ops/enterprise-gate-rollout.md)

---

## Table of Contents

1. [Types & Constants](#types--constants)
2. [Profile Selection Logic](#profile-selection-logic)
3. [Enterprise Detection](#enterprise-detection)
4. [Budget Enforcement](#budget-enforcement)
5. [Coverage Summary](#coverage-summary)
6. [Telemetry Events](#telemetry-events)
7. [Feature Flags](#feature-flags)
8. [Database Schema](#database-schema)

---

## Types & Constants

### File: `src/types/scan-profiles.ts`

```typescript
/**
 * Scan profile types defining crawl budgets and strategies
 */
export type ScanProfile = 'QUICK' | 'SMART' | 'DEEP';

/**
 * Crawl strategy for profile
 */
export type CrawlStrategy =
  | 'complete'              // Exhaust all URLs
  | 'priority-sampling'     // Sample based on priority
  | 'comprehensive';        // Full coverage with prioritization

/**
 * Page priority categories for crawl queue
 */
export type PagePriority =
  | 'homepage'      // Site root (highest priority)
  | 'product'       // Product/service pages
  | 'navigation'    // Main nav links
  | 'content'       // Blog, articles, content
  | 'utility';      // Privacy, terms, etc. (lowest)

/**
 * Budget limits for a scan profile
 */
export interface ProfileBudget {
  /** Maximum URLs to crawl before stopping */
  maxUrls: number;

  /** Maximum scan duration in milliseconds */
  maxDuration: number;

  /** Crawl strategy to use */
  strategy: CrawlStrategy;

  /** Whether to load sitemap first */
  sitemapFirst: boolean;

  /** Priority order for URL crawling */
  priorityOrder: PagePriority[];

  /** URL threshold to trigger enterprise detection (SMART only) */
  enterpriseDetectionThreshold?: number;

  /** Whether scan is resumable (DEEP only) */
  resumable?: boolean;

  /** Checkpoint interval for resumable scans (DEEP only) */
  checkpointInterval?: number;
}

/**
 * Predefined profile budgets
 */
export const PROFILE_BUDGETS: Record<ScanProfile, ProfileBudget> = {
  QUICK: {
    maxUrls: 50,
    maxDuration: 5 * 60 * 1000, // 5 minutes
    strategy: 'complete',
    sitemapFirst: true,
    priorityOrder: ['homepage', 'navigation', 'product', 'content', 'utility'],
  },

  SMART: {
    maxUrls: 150,
    maxDuration: 10 * 60 * 1000, // 10 minutes
    strategy: 'priority-sampling',
    sitemapFirst: true,
    priorityOrder: ['homepage', 'product', 'navigation', 'content', 'utility'],
    enterpriseDetectionThreshold: 150,
  },

  DEEP: {
    maxUrls: 1000,
    maxDuration: 30 * 60 * 1000, // 30 minutes
    strategy: 'comprehensive',
    sitemapFirst: true,
    priorityOrder: ['homepage', 'product', 'navigation', 'content', 'utility'],
    resumable: true,
    checkpointInterval: 100,
  },
};

/**
 * Enterprise detection result
 */
export interface EnterpriseDetection {
  /** Whether site is detected as enterprise */
  isEnterprise: boolean;

  /** Reason for detection */
  reason?: 'sitemap_size' | 'url_discovery' | 'time_and_growth';

  /** Estimated total pages */
  estimatedPages?: number;

  /** Pages scanned before detection */
  scannedPages: number;

  /** Elapsed time at detection (ms) */
  elapsedTime: number;
}

/**
 * Coverage summary for scan report
 */
export interface CoverageSummary {
  /** Profile used for scan */
  profile: ScanProfile;

  /** Total URLs scanned */
  scannedUrls: number;

  /** Estimated total URLs on site */
  estimatedTotalUrls: number;

  /** Coverage percentage (0-100) */
  coveragePercent: number;

  /** Whether scan reached budget limit */
  reachedLimit: boolean;

  /** Reason scan stopped */
  stopReason: 'complete' | 'url_limit' | 'time_limit' | 'enterprise_detected';

  /** Enterprise detection details (if applicable) */
  enterpriseDetection?: EnterpriseDetection;
}
```

---

## Profile Selection Logic

### File: `src/lib/scan-profiles.ts`

```typescript
import type { ScanProfile, ProfileBudget } from '@/types/scan-profiles';
import { PROFILE_BUDGETS } from '@/types/scan-profiles';

/**
 * User tier from database
 */
export type UserTier = 'free' | 'pro' | 'enterprise';

/**
 * Select appropriate scan profile based on user tier and site hints
 */
export function selectScanProfile(params: {
  userTier: UserTier;
  sitemapUrlCount?: number;
  userOverride?: ScanProfile;
}): ScanProfile {
  const { userTier, sitemapUrlCount, userOverride } = params;

  // User override (Enterprise only for DEEP)
  if (userOverride) {
    if (userOverride === 'DEEP' && userTier !== 'enterprise') {
      throw new Error('DEEP profile requires Enterprise tier');
    }
    return userOverride;
  }

  // Enterprise users default to DEEP
  if (userTier === 'enterprise') {
    return 'DEEP';
  }

  // Auto-select based on sitemap size
  if (sitemapUrlCount !== undefined) {
    if (sitemapUrlCount <= 50) {
      return 'QUICK';
    }
    return 'SMART'; // 50-150+ pages
  }

  // Default to SMART for Pro, QUICK for Free
  return userTier === 'pro' ? 'SMART' : 'QUICK';
}

/**
 * Get budget for a profile
 */
export function getProfileBudget(profile: ScanProfile): ProfileBudget {
  return PROFILE_BUDGETS[profile];
}

/**
 * Check if user has access to profile
 */
export function canUseProfile(profile: ScanProfile, userTier: UserTier): boolean {
  if (profile === 'DEEP') {
    return userTier === 'enterprise';
  }
  return true; // QUICK and SMART available to all
}
```

### Testing

**Unit Tests** (`__tests__/scan-profiles.test.ts`):
```typescript
import { selectScanProfile, canUseProfile } from '@/lib/scan-profiles';

describe('selectScanProfile', () => {
  it('selects QUICK for free tier with small sitemap', () => {
    expect(selectScanProfile({
      userTier: 'free',
      sitemapUrlCount: 25
    })).toBe('QUICK');
  });

  it('selects SMART for pro tier with medium sitemap', () => {
    expect(selectScanProfile({
      userTier: 'pro',
      sitemapUrlCount: 100
    })).toBe('SMART');
  });

  it('selects DEEP for enterprise tier by default', () => {
    expect(selectScanProfile({
      userTier: 'enterprise'
    })).toBe('DEEP');
  });

  it('throws error for DEEP override on non-enterprise', () => {
    expect(() => selectScanProfile({
      userTier: 'pro',
      userOverride: 'DEEP'
    })).toThrow('DEEP profile requires Enterprise tier');
  });
});

describe('canUseProfile', () => {
  it('allows DEEP only for enterprise', () => {
    expect(canUseProfile('DEEP', 'enterprise')).toBe(true);
    expect(canUseProfile('DEEP', 'pro')).toBe(false);
    expect(canUseProfile('DEEP', 'free')).toBe(false);
  });

  it('allows QUICK and SMART for all tiers', () => {
    expect(canUseProfile('QUICK', 'free')).toBe(true);
    expect(canUseProfile('SMART', 'pro')).toBe(true);
  });
});
```

---

## Enterprise Detection

### File: `src/lib/enterprise-detection.ts`

```typescript
import type { EnterpriseDetection, ProfileBudget } from '@/types/scan-profiles';

export interface CrawlState {
  /** URLs discovered so far */
  discoveredUrls: number;

  /** URLs scanned so far */
  scannedUrls: number;

  /** URLs still in frontier (to be crawled) */
  frontierSize: number;

  /** Elapsed time since scan start (ms) */
  elapsedTime: number;

  /** URLs from sitemap (if loaded) */
  sitemapUrls?: number;
}

/**
 * Detect if site is enterprise based on crawl state and budget
 */
export function detectEnterpriseSite(
  state: CrawlState,
  budget: ProfileBudget
): EnterpriseDetection {
  const { discoveredUrls, scannedUrls, frontierSize, elapsedTime, sitemapUrls } = state;
  const threshold = budget.enterpriseDetectionThreshold;

  // Only applies to SMART profile
  if (!threshold) {
    return {
      isEnterprise: false,
      scannedPages: scannedUrls,
      elapsedTime,
    };
  }

  // Detection 1: Sitemap size
  if (sitemapUrls && sitemapUrls > threshold) {
    return {
      isEnterprise: true,
      reason: 'sitemap_size',
      estimatedPages: sitemapUrls,
      scannedPages: scannedUrls,
      elapsedTime,
    };
  }

  // Detection 2: URL discovery threshold
  if (discoveredUrls > threshold) {
    return {
      isEnterprise: true,
      reason: 'url_discovery',
      estimatedPages: discoveredUrls + Math.floor(frontierSize * 1.5), // Rough estimate
      scannedPages: scannedUrls,
      elapsedTime,
    };
  }

  // Detection 3: Time + growth heuristic
  const GROWTH_DETECTION_TIME = 5 * 60 * 1000; // 5 minutes
  const GROWTH_FRONTIER_THRESHOLD = 50;

  if (elapsedTime > GROWTH_DETECTION_TIME && frontierSize > GROWTH_FRONTIER_THRESHOLD) {
    return {
      isEnterprise: true,
      reason: 'time_and_growth',
      estimatedPages: discoveredUrls + frontierSize * 2, // Conservative estimate
      scannedPages: scannedUrls,
      elapsedTime,
    };
  }

  return {
    isEnterprise: false,
    scannedPages: scannedUrls,
    elapsedTime,
  };
}
```

### Testing

**Unit Tests** (`__tests__/enterprise-detection.test.ts`):
```typescript
import { detectEnterpriseSite } from '@/lib/enterprise-detection';
import { PROFILE_BUDGETS } from '@/types/scan-profiles';

describe('detectEnterpriseSite', () => {
  const smartBudget = PROFILE_BUDGETS.SMART;

  it('detects enterprise via sitemap size', () => {
    const result = detectEnterpriseSite({
      discoveredUrls: 100,
      scannedUrls: 50,
      frontierSize: 50,
      elapsedTime: 60000,
      sitemapUrls: 200
    }, smartBudget);

    expect(result.isEnterprise).toBe(true);
    expect(result.reason).toBe('sitemap_size');
    expect(result.estimatedPages).toBe(200);
  });

  it('detects enterprise via URL discovery', () => {
    const result = detectEnterpriseSite({
      discoveredUrls: 180,
      scannedUrls: 150,
      frontierSize: 30,
      elapsedTime: 120000
    }, smartBudget);

    expect(result.isEnterprise).toBe(true);
    expect(result.reason).toBe('url_discovery');
  });

  it('detects enterprise via time + growth', () => {
    const result = detectEnterpriseSite({
      discoveredUrls: 130,
      scannedUrls: 80,
      frontierSize: 60,
      elapsedTime: 6 * 60 * 1000 // 6 minutes
    }, smartBudget);

    expect(result.isEnterprise).toBe(true);
    expect(result.reason).toBe('time_and_growth');
  });

  it('does not detect for small sites', () => {
    const result = detectEnterpriseSite({
      discoveredUrls: 50,
      scannedUrls: 40,
      frontierSize: 10,
      elapsedTime: 120000
    }, smartBudget);

    expect(result.isEnterprise).toBe(false);
  });
});
```

---

## Budget Enforcement

### File: `scripts/crawler/pageCrawler.ts` (Modifications)

**Add to existing `pageCrawler.ts`**:

```typescript
import type { ProfileBudget, CoverageSummary } from '@/types/scan-profiles';
import { detectEnterpriseSite } from '@/lib/enterprise-detection';

export interface CrawlerOptions {
  /** Existing options... */
  url: string;
  maxConcurrency?: number;

  /** NEW: Budget enforcement */
  budget?: ProfileBudget;

  /** NEW: User tier for enterprise detection */
  userTier?: 'free' | 'pro' | 'enterprise';

  /** NEW: Callback when enterprise site detected */
  onEnterpriseDetected?: (detection: EnterpriseDetection) => void;
}

export interface CrawlerResult {
  /** Existing result fields... */
  pages: CrawledPage[];

  /** NEW: Coverage summary */
  coverage?: CoverageSummary;
}

/**
 * Enhanced crawl loop with budget enforcement
 */
async function crawlWithBudget(options: CrawlerOptions): Promise<CrawlerResult> {
  const { url, budget, userTier, onEnterpriseDetected } = options;

  const startTime = Date.now();
  const scannedUrls: Set<string> = new Set();
  const discoveredUrls: Set<string> = new Set();
  const frontier: string[] = [url];
  const pages: CrawledPage[] = [];

  // Load sitemap first (if budget allows)
  let sitemapUrls: number | undefined;
  if (budget?.sitemapFirst) {
    const sitemap = await loadSitemap(url);
    if (sitemap) {
      sitemapUrls = sitemap.urls.length;
      frontier.push(...sitemap.urls.slice(0, budget.maxUrls));
      sitemap.urls.forEach(u => discoveredUrls.add(u));
    }
  }

  // Crawl loop
  while (frontier.length > 0) {
    const elapsedTime = Date.now() - startTime;

    // Check budget: max duration
    if (budget && elapsedTime >= budget.maxDuration) {
      return {
        pages,
        coverage: createCoverageSummary({
          profile: 'SMART', // Inferred from budget
          scannedUrls: scannedUrls.size,
          discoveredUrls: discoveredUrls.size,
          stopReason: 'time_limit',
          elapsedTime,
        }),
      };
    }

    // Check budget: max URLs
    if (budget && scannedUrls.size >= budget.maxUrls) {
      return {
        pages,
        coverage: createCoverageSummary({
          profile: 'SMART',
          scannedUrls: scannedUrls.size,
          discoveredUrls: discoveredUrls.size,
          stopReason: 'url_limit',
          elapsedTime,
        }),
      };
    }

    // Check enterprise detection (SMART profile only)
    if (budget?.enterpriseDetectionThreshold && userTier !== 'enterprise') {
      const detection = detectEnterpriseSite({
        discoveredUrls: discoveredUrls.size,
        scannedUrls: scannedUrls.size,
        frontierSize: frontier.length,
        elapsedTime,
        sitemapUrls,
      }, budget);

      if (detection.isEnterprise) {
        // Trigger enterprise detection callback
        onEnterpriseDetected?.(detection);

        return {
          pages,
          coverage: createCoverageSummary({
            profile: 'SMART',
            scannedUrls: scannedUrls.size,
            discoveredUrls: discoveredUrls.size,
            stopReason: 'enterprise_detected',
            elapsedTime,
            enterpriseDetection: detection,
          }),
        };
      }
    }

    // Crawl next URL
    const nextUrl = frontier.shift()!;
    if (scannedUrls.has(nextUrl)) continue;

    const page = await crawlPage(nextUrl);
    pages.push(page);
    scannedUrls.add(nextUrl);

    // Discover new URLs
    page.links.forEach(link => {
      if (!scannedUrls.has(link) && !discoveredUrls.has(link)) {
        discoveredUrls.add(link);
        frontier.push(link);
      }
    });

    // Sort frontier by priority (if budget specifies)
    if (budget?.priorityOrder) {
      frontier.sort((a, b) => {
        const aPriority = getPagePriority(a, budget.priorityOrder);
        const bPriority = getPagePriority(b, budget.priorityOrder);
        return aPriority - bPriority;
      });
    }
  }

  // Complete scan (exhausted frontier)
  return {
    pages,
    coverage: createCoverageSummary({
      profile: budget?.strategy === 'complete' ? 'QUICK' : 'SMART',
      scannedUrls: scannedUrls.size,
      discoveredUrls: discoveredUrls.size,
      stopReason: 'complete',
      elapsedTime: Date.now() - startTime,
    }),
  };
}

/**
 * Create coverage summary from crawl state
 */
function createCoverageSummary(params: {
  profile: ScanProfile;
  scannedUrls: number;
  discoveredUrls: number;
  stopReason: CoverageSummary['stopReason'];
  elapsedTime: number;
  enterpriseDetection?: EnterpriseDetection;
}): CoverageSummary {
  const { profile, scannedUrls, discoveredUrls, stopReason, enterpriseDetection } = params;

  const estimatedTotal = enterpriseDetection?.estimatedPages ?? discoveredUrls;
  const coverage = estimatedTotal > 0
    ? Math.round((scannedUrls / estimatedTotal) * 100)
    : 100;

  return {
    profile,
    scannedUrls,
    estimatedTotalUrls: estimatedTotal,
    coveragePercent: coverage,
    reachedLimit: stopReason !== 'complete',
    stopReason,
    enterpriseDetection,
  };
}

/**
 * Get priority score for URL (lower = higher priority)
 */
function getPagePriority(url: string, priorityOrder: PagePriority[]): number {
  const urlPath = new URL(url).pathname;

  // Homepage
  if (urlPath === '/' || urlPath === '') {
    return priorityOrder.indexOf('homepage');
  }

  // Product pages (heuristic: /product, /services, /solutions)
  if (/\/(product|service|solution)/.test(urlPath)) {
    return priorityOrder.indexOf('product');
  }

  // Navigation (heuristic: top-level paths)
  if (urlPath.split('/').filter(Boolean).length === 1) {
    return priorityOrder.indexOf('navigation');
  }

  // Utility (heuristic: privacy, terms, etc.)
  if (/\/(privacy|terms|about|contact)/.test(urlPath)) {
    return priorityOrder.indexOf('utility');
  }

  // Default to content
  return priorityOrder.indexOf('content');
}
```

---

## Coverage Summary

### Display Logic

**File**: `src/app/components/reports/CoverageBanner.tsx`

```typescript
import type { CoverageSummary } from '@/types/scan-profiles';
import { AlertCircle, CheckCircle, Building2 } from 'lucide-react';

export function CoverageBanner({ coverage }: { coverage: CoverageSummary }) {
  if (coverage.stopReason === 'complete') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-green-900">Complete Scan</h3>
          <p className="text-sm text-green-700">
            Analyzed all {coverage.scannedUrls} pages on your site.
          </p>
        </div>
      </div>
    );
  }

  if (coverage.stopReason === 'enterprise_detected') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">Sample Report - Enterprise Site Detected</h3>
          <p className="text-sm text-blue-700 mt-1">
            Analyzed {coverage.scannedUrls} of ~{coverage.estimatedTotalUrls} estimated pages
            ({coverage.coveragePercent}% coverage).
            Upgrade to Enterprise for complete analysis.
          </p>
          <button className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800">
            Upgrade to Enterprise →
          </button>
        </div>
      </div>
    );
  }

  // SMART profile partial coverage
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <h3 className="font-semibold text-amber-900">Smart Scan - Priority Sampling</h3>
        <p className="text-sm text-amber-700 mt-1">
          Analyzed {coverage.scannedUrls} of ~{coverage.estimatedTotalUrls} estimated pages
          ({coverage.coveragePercent}% coverage)
        </p>
        <ul className="text-sm text-amber-700 mt-2 space-y-1">
          <li>• All high-priority pages scanned (homepage, products, navigation)</li>
          <li>• Sample of content pages included</li>
          <li>• Upgrade to Enterprise for 100% coverage</li>
        </ul>
      </div>
    </div>
  );
}
```

---

## Telemetry Events

### Event Schema

**File**: `src/lib/telemetry.ts`

```typescript
export interface CrawlSummaryEvent {
  event: 'crawl.summary.v1';
  timestamp: string; // ISO 8601
  scan_id: string;
  site_id: string;
  user_id: string;
  team_id: string;

  profile: ScanProfile;
  user_tier: 'free' | 'pro' | 'enterprise';

  scanned_urls: number;
  discovered_urls: number;
  estimated_total_urls: number;
  coverage_percent: number;

  stop_reason: 'complete' | 'url_limit' | 'time_limit' | 'enterprise_detected';
  elapsed_time_ms: number;

  enterprise_detected: boolean;
  enterprise_detection_reason?: 'sitemap_size' | 'url_discovery' | 'time_and_growth';

  budget_max_urls: number;
  budget_max_duration_ms: number;
}

/**
 * Emit crawl summary telemetry event
 */
export function emitCrawlSummary(params: Omit<CrawlSummaryEvent, 'event' | 'timestamp'>) {
  const event: CrawlSummaryEvent = {
    event: 'crawl.summary.v1',
    timestamp: new Date().toISOString(),
    ...params,
  };

  // Send to analytics (PostHog, Mixpanel, etc.)
  console.log('[Telemetry]', event);

  // Future: send to telemetry service
  // await fetch('/api/telemetry', { method: 'POST', body: JSON.stringify(event) });
}
```

---

## Feature Flags

### Environment Variables

```bash
# .env.local

# Enable scan profiles feature
NEXT_PUBLIC_FEATURE_SCAN_PROFILES=true

# Enable enterprise detection gating
NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING=true
```

### Runtime Config

**File**: `src/lib/feature-flags.ts`

```typescript
export const featureFlags = {
  scanProfiles: process.env.NEXT_PUBLIC_FEATURE_SCAN_PROFILES === 'true',
  enterpriseGating: process.env.NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING === 'true',
} as const;

export function isScanProfilesEnabled(): boolean {
  return featureFlags.scanProfiles;
}

export function isEnterpriseGatingEnabled(): boolean {
  return featureFlags.enterpriseGating;
}
```

### Usage in Code

```typescript
import { isScanProfilesEnabled } from '@/lib/feature-flags';

export async function POST(req: Request) {
  if (!isScanProfilesEnabled()) {
    // Fall back to legacy scan behavior
    return legacyScan(req);
  }

  // New profile-based scan
  return profileBasedScan(req);
}
```

---

## Database Schema

### Migration: Add scan profiles tracking

**File**: `supabase/migrations/NNNN_add_scan_profiles.sql`

```sql
-- Add profile column to scans table
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS profile TEXT DEFAULT 'QUICK' CHECK (profile IN ('QUICK', 'SMART', 'DEEP'));

-- Add coverage summary columns
ALTER TABLE scans
ADD COLUMN IF NOT EXISTS scanned_urls INTEGER,
ADD COLUMN IF NOT EXISTS estimated_total_urls INTEGER,
ADD COLUMN IF NOT EXISTS coverage_percent INTEGER,
ADD COLUMN IF NOT EXISTS stop_reason TEXT CHECK (stop_reason IN ('complete', 'url_limit', 'time_limit', 'enterprise_detected')),
ADD COLUMN IF NOT EXISTS enterprise_detected BOOLEAN DEFAULT FALSE;

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_scans_profile ON scans(profile);
CREATE INDEX IF NOT EXISTS idx_scans_enterprise_detected ON scans(enterprise_detected) WHERE enterprise_detected = TRUE;

-- Comment columns
COMMENT ON COLUMN scans.profile IS 'Scan profile used: QUICK, SMART, or DEEP';
COMMENT ON COLUMN scans.scanned_urls IS 'Number of URLs actually scanned';
COMMENT ON COLUMN scans.estimated_total_urls IS 'Estimated total URLs on site';
COMMENT ON COLUMN scans.coverage_percent IS 'Coverage percentage (0-100)';
COMMENT ON COLUMN scans.stop_reason IS 'Reason scan stopped';
COMMENT ON COLUMN scans.enterprise_detected IS 'Whether enterprise site was detected during scan';
```

### RLS Policies

No changes needed - existing RLS policies apply.

---

## Implementation Checklist

### PR #1: Profiles & Budgets Foundation

- [ ] Create `src/types/scan-profiles.ts` with all types
- [ ] Create `src/lib/scan-profiles.ts` with selection logic
- [ ] Add unit tests for profile selection
- [ ] Create feature flag in `.env.local`
- [ ] Update `CHANGELOG.md`

### PR #2: Enterprise Detection

- [ ] Create `src/lib/enterprise-detection.ts`
- [ ] Implement detection logic (sitemap, discovery, time+growth)
- [ ] Add unit tests for all detection paths
- [ ] Update `CHANGELOG.md`

### PR #3: Budget Enforcement

- [ ] Modify `scripts/crawler/pageCrawler.ts`
- [ ] Add budget enforcement to crawl loop
- [ ] Add coverage summary generation
- [ ] Add priority queue sorting
- [ ] Add integration tests
- [ ] Create database migration
- [ ] Update `CHANGELOG.md`

### PR #4: Enterprise Modal UI

- [ ] Create `EnterpriseDetectionModal.tsx` component
- [ ] Wire up detection callback from crawler
- [ ] Add "Upgrade" and "View Report" CTAs
- [ ] Add component tests
- [ ] Update `CHANGELOG.md`

### PR #5: Coverage Summary UI

- [ ] Create `CoverageBanner.tsx` component
- [ ] Integrate into scan report page
- [ ] Add sample report filtering logic
- [ ] Add E2E smoke test
- [ ] Update `CHANGELOG.md`

---

## Revision History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0     | 2025-10-04 | Initial technical specification  |


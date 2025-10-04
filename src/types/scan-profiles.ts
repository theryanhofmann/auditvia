/**
 * Scan Profiles - Type Definitions
 *
 * Defines scan profile types, budgets, and coverage tracking
 * for QUICK/SMART/DEEP scanning strategies.
 *
 * @see /docs/tech/scan-profiles-spec.md
 */

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
  stopReason: 'complete' | 'url_limit' | 'time_limit' | 'enterprise_detected' | 'budget';

  /** Enterprise detection details (if applicable) */
  enterpriseDetection?: EnterpriseDetection;

  /** Scan start timestamp (ISO 8601) */
  startedAt?: string;

  /** Scan end timestamp (ISO 8601) */
  endedAt?: string;

  /** Pages actually crawled */
  pagesCrawled?: number;

  /** URLs discovered during crawl */
  discoveredUrls?: number;
}

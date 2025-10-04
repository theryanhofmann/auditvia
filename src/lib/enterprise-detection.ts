/**
 * Enterprise Site Detection
 *
 * Detects when a scan is analyzing an enterprise-scale website based on
 * URL discovery patterns and crawl duration heuristics.
 *
 * @see /docs/tech/scan-profiles-spec.md#enterprise-detection
 */

/**
 * Configurable detection thresholds
 * Export for testing and future tuning
 */
export const URL_THRESHOLD = 150;
export const TIME_THRESHOLD_MIN = 5;

/**
 * Input parameters for enterprise detection
 */
export type DetectionInput = {
  /** Total number of URLs discovered during crawl */
  discoveredUrls: number;

  /** Elapsed time in minutes since scan start */
  elapsedMinutes: number;

  /** Whether the frontier (queue) is still growing */
  frontierGrowing: boolean;
};

/**
 * Detection result with reason
 */
export type DetectionResult = {
  /** Whether site is detected as enterprise */
  isEnterprise: boolean;

  /** Reason for detection, null if not enterprise */
  reason: 'url_threshold' | 'time_frontier' | null;
};

/**
 * Detect if a site should be classified as enterprise based on crawl metrics
 *
 * Detection Rules:
 * - Rule A: discoveredUrls > URL_THRESHOLD → trigger "url_threshold"
 * - Rule B: elapsedMinutes > TIME_THRESHOLD_MIN AND frontierGrowing → trigger "time_frontier"
 *
 * @param input - Detection input metrics from active crawl
 * @returns Detection result with isEnterprise flag and reason
 *
 * @example
 * ```typescript
 * const result = detectEnterprise({
 *   discoveredUrls: 175,
 *   elapsedMinutes: 4,
 *   frontierGrowing: true
 * });
 * // Returns: { isEnterprise: true, reason: 'url_threshold' }
 * ```
 */
export function detectEnterprise(input: DetectionInput): DetectionResult {
  const { discoveredUrls, elapsedMinutes, frontierGrowing } = input;

  // Rule A: URL threshold exceeded
  if (discoveredUrls > URL_THRESHOLD) {
    return {
      isEnterprise: true,
      reason: 'url_threshold',
    };
  }

  // Rule B: Time threshold + growing frontier (still discovering pages)
  if (elapsedMinutes > TIME_THRESHOLD_MIN && frontierGrowing) {
    return {
      isEnterprise: true,
      reason: 'time_frontier',
    };
  }

  // Not enterprise
  return {
    isEnterprise: false,
    reason: null,
  };
}

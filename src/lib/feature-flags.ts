/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for gradual rollouts and A/B testing.
 *
 * @see /docs/ops/safety-rules.md#feature-flag-policy
 */

/**
 * Feature flag configuration object
 * All flags default to false for safety
 */
export const featureFlags = {
  /** Enable scan profiles (QUICK/SMART/DEEP) */
  scanProfiles: process.env.NEXT_PUBLIC_FEATURE_SCAN_PROFILES === 'true',

  /** Enable enterprise detection and gating */
  enterpriseGating: process.env.NEXT_PUBLIC_FEATURE_ENTERPRISE_GATING === 'true',
} as const;

/**
 * Check if scan profiles feature is enabled
 *
 * @returns True if scan profiles are enabled
 *
 * @example
 * ```typescript
 * if (isScanProfilesEnabled()) {
 *   // Use new profile-based scanning
 * } else {
 *   // Use legacy scanning
 * }
 * ```
 */
export function isScanProfilesEnabled(): boolean {
  return featureFlags.scanProfiles;
}

/**
 * Check if enterprise gating feature is enabled
 *
 * @returns True if enterprise gating is enabled
 *
 * @example
 * ```typescript
 * if (isEnterpriseGatingEnabled()) {
 *   // Show enterprise upgrade modal
 * }
 * ```
 */
export function isEnterpriseGatingEnabled(): boolean {
  return featureFlags.enterpriseGating;
}

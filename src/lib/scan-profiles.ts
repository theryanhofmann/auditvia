/**
 * Scan Profile Selection Logic
 *
 * Determines appropriate scan profile based on user tier and site characteristics.
 *
 * @see /docs/tech/scan-profiles-spec.md
 */

import type { ScanProfile, ProfileBudget } from '@/types/scan-profiles';
import { PROFILE_BUDGETS } from '@/types/scan-profiles';

/**
 * User tier from database
 */
export type UserTier = 'free' | 'pro' | 'enterprise';

/**
 * Select appropriate scan profile based on user tier and site hints
 *
 * @param params - Profile selection parameters
 * @param params.userTier - User's subscription tier
 * @param params.sitemapUrlCount - Number of URLs in sitemap (if available)
 * @param params.userOverride - Manual profile override (Enterprise only for DEEP)
 * @returns Selected scan profile
 * @throws Error if user tries to use DEEP profile without Enterprise tier
 *
 * @example
 * ```typescript
 * const profile = selectScanProfile({
 *   userTier: 'pro',
 *   sitemapUrlCount: 100
 * });
 * // Returns 'SMART'
 * ```
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
 * Get budget configuration for a profile
 *
 * @param profile - Scan profile type
 * @returns Budget limits and strategy for the profile
 *
 * @example
 * ```typescript
 * const budget = getProfileBudget('SMART');
 * console.log(budget.maxUrls); // 150
 * console.log(budget.strategy); // 'priority-sampling'
 * ```
 */
export function getProfileBudget(profile: ScanProfile): ProfileBudget {
  return PROFILE_BUDGETS[profile];
}

/**
 * Check if user has access to a specific profile
 *
 * @param profile - Profile to check access for
 * @param userTier - User's subscription tier
 * @returns True if user can use the profile
 *
 * @example
 * ```typescript
 * canUseProfile('DEEP', 'pro'); // false
 * canUseProfile('DEEP', 'enterprise'); // true
 * canUseProfile('SMART', 'free'); // true
 * ```
 */
export function canUseProfile(profile: ScanProfile, userTier: UserTier): boolean {
  if (profile === 'DEEP') {
    return userTier === 'enterprise';
  }
  return true; // QUICK and SMART available to all
}

/**
 * Unit Tests: Scan Profile Selection Logic
 *
 * Tests for selectScanProfile, getProfileBudget, and canUseProfile functions.
 *
 * @see /docs/tech/scan-profiles-spec.md#profile-selection-logic
 */

import { describe, it, expect } from '@jest/globals';
import {
  selectScanProfile,
  getProfileBudget,
  canUseProfile,
  type UserTier,
} from '@/lib/scan-profiles';
import type { ScanProfile } from '@/types/scan-profiles';
import { PROFILE_BUDGETS } from '@/types/scan-profiles';

describe('selectScanProfile', () => {
  describe('Free Tier', () => {
    it('selects QUICK for small sitemap (<= 50 URLs)', () => {
      const profile = selectScanProfile({
        userTier: 'free',
        sitemapUrlCount: 25,
      });
      expect(profile).toBe('QUICK');
    });

    it('selects SMART for medium sitemap (> 50 URLs)', () => {
      const profile = selectScanProfile({
        userTier: 'free',
        sitemapUrlCount: 100,
      });
      expect(profile).toBe('SMART');
    });

    it('defaults to QUICK when no sitemap info', () => {
      const profile = selectScanProfile({
        userTier: 'free',
      });
      expect(profile).toBe('QUICK');
    });
  });

  describe('Pro Tier', () => {
    it('selects QUICK for small sitemap (<= 50 URLs)', () => {
      const profile = selectScanProfile({
        userTier: 'pro',
        sitemapUrlCount: 40,
      });
      expect(profile).toBe('QUICK');
    });

    it('selects SMART for medium sitemap (> 50 URLs)', () => {
      const profile = selectScanProfile({
        userTier: 'pro',
        sitemapUrlCount: 120,
      });
      expect(profile).toBe('SMART');
    });

    it('defaults to SMART when no sitemap info', () => {
      const profile = selectScanProfile({
        userTier: 'pro',
      });
      expect(profile).toBe('SMART');
    });
  });

  describe('Enterprise Tier', () => {
    it('defaults to DEEP regardless of sitemap size', () => {
      const profileSmall = selectScanProfile({
        userTier: 'enterprise',
        sitemapUrlCount: 30,
      });
      expect(profileSmall).toBe('DEEP');

      const profileLarge = selectScanProfile({
        userTier: 'enterprise',
        sitemapUrlCount: 500,
      });
      expect(profileLarge).toBe('DEEP');
    });

    it('selects DEEP when no sitemap info', () => {
      const profile = selectScanProfile({
        userTier: 'enterprise',
      });
      expect(profile).toBe('DEEP');
    });
  });

  describe('User Overrides', () => {
    it('allows QUICK override for all tiers', () => {
      const profiles: Record<UserTier, ScanProfile> = {
        free: selectScanProfile({ userTier: 'free', userOverride: 'QUICK' }),
        pro: selectScanProfile({ userTier: 'pro', userOverride: 'QUICK' }),
        enterprise: selectScanProfile({ userTier: 'enterprise', userOverride: 'QUICK' }),
      };

      expect(profiles.free).toBe('QUICK');
      expect(profiles.pro).toBe('QUICK');
      expect(profiles.enterprise).toBe('QUICK');
    });

    it('allows SMART override for all tiers', () => {
      const profiles: Record<UserTier, ScanProfile> = {
        free: selectScanProfile({ userTier: 'free', userOverride: 'SMART' }),
        pro: selectScanProfile({ userTier: 'pro', userOverride: 'SMART' }),
        enterprise: selectScanProfile({ userTier: 'enterprise', userOverride: 'SMART' }),
      };

      expect(profiles.free).toBe('SMART');
      expect(profiles.pro).toBe('SMART');
      expect(profiles.enterprise).toBe('SMART');
    });

    it('allows DEEP override for Enterprise tier', () => {
      const profile = selectScanProfile({
        userTier: 'enterprise',
        userOverride: 'DEEP',
      });
      expect(profile).toBe('DEEP');
    });

    it('throws error for DEEP override on Free tier', () => {
      expect(() =>
        selectScanProfile({
          userTier: 'free',
          userOverride: 'DEEP',
        })
      ).toThrow('DEEP profile requires Enterprise tier');
    });

    it('throws error for DEEP override on Pro tier', () => {
      expect(() =>
        selectScanProfile({
          userTier: 'pro',
          userOverride: 'DEEP',
        })
      ).toThrow('DEEP profile requires Enterprise tier');
    });
  });

  describe('Edge Cases', () => {
    it('handles sitemap with exactly 50 URLs (boundary)', () => {
      const profile = selectScanProfile({
        userTier: 'free',
        sitemapUrlCount: 50,
      });
      expect(profile).toBe('QUICK'); // <= 50
    });

    it('handles sitemap with 51 URLs (boundary + 1)', () => {
      const profile = selectScanProfile({
        userTier: 'free',
        sitemapUrlCount: 51,
      });
      expect(profile).toBe('SMART'); // > 50
    });

    it('handles sitemap with 0 URLs', () => {
      const profile = selectScanProfile({
        userTier: 'pro',
        sitemapUrlCount: 0,
      });
      expect(profile).toBe('QUICK'); // 0 <= 50
    });
  });
});

describe('getProfileBudget', () => {
  it('returns QUICK budget with correct values', () => {
    const budget = getProfileBudget('QUICK');

    expect(budget.maxUrls).toBe(50);
    expect(budget.maxDuration).toBe(5 * 60 * 1000); // 5 minutes
    expect(budget.strategy).toBe('complete');
    expect(budget.sitemapFirst).toBe(true);
    expect(budget.enterpriseDetectionThreshold).toBeUndefined();
    expect(budget.priorityOrder).toEqual([
      'homepage',
      'navigation',
      'product',
      'content',
      'utility',
    ]);
  });

  it('returns SMART budget with correct values', () => {
    const budget = getProfileBudget('SMART');

    expect(budget.maxUrls).toBe(150);
    expect(budget.maxDuration).toBe(10 * 60 * 1000); // 10 minutes
    expect(budget.strategy).toBe('priority-sampling');
    expect(budget.sitemapFirst).toBe(true);
    expect(budget.enterpriseDetectionThreshold).toBe(150);
    expect(budget.priorityOrder).toEqual([
      'homepage',
      'product',
      'navigation',
      'content',
      'utility',
    ]);
  });

  it('returns DEEP budget with correct values', () => {
    const budget = getProfileBudget('DEEP');

    expect(budget.maxUrls).toBe(1000);
    expect(budget.maxDuration).toBe(30 * 60 * 1000); // 30 minutes
    expect(budget.strategy).toBe('comprehensive');
    expect(budget.sitemapFirst).toBe(true);
    expect(budget.resumable).toBe(true);
    expect(budget.checkpointInterval).toBe(100);
    expect(budget.priorityOrder).toEqual([
      'homepage',
      'product',
      'navigation',
      'content',
      'utility',
    ]);
  });

  it('returns same reference for multiple calls (cached)', () => {
    const budget1 = getProfileBudget('SMART');
    const budget2 = getProfileBudget('SMART');

    expect(budget1).toBe(budget2); // Same object reference
  });
});

describe('canUseProfile', () => {
  describe('QUICK Profile', () => {
    it('allows Free tier', () => {
      expect(canUseProfile('QUICK', 'free')).toBe(true);
    });

    it('allows Pro tier', () => {
      expect(canUseProfile('QUICK', 'pro')).toBe(true);
    });

    it('allows Enterprise tier', () => {
      expect(canUseProfile('QUICK', 'enterprise')).toBe(true);
    });
  });

  describe('SMART Profile', () => {
    it('allows Free tier', () => {
      expect(canUseProfile('SMART', 'free')).toBe(true);
    });

    it('allows Pro tier', () => {
      expect(canUseProfile('SMART', 'pro')).toBe(true);
    });

    it('allows Enterprise tier', () => {
      expect(canUseProfile('SMART', 'enterprise')).toBe(true);
    });
  });

  describe('DEEP Profile', () => {
    it('denies Free tier', () => {
      expect(canUseProfile('DEEP', 'free')).toBe(false);
    });

    it('denies Pro tier', () => {
      expect(canUseProfile('DEEP', 'pro')).toBe(false);
    });

    it('allows Enterprise tier', () => {
      expect(canUseProfile('DEEP', 'enterprise')).toBe(true);
    });
  });
});

describe('PROFILE_BUDGETS Constant', () => {
  it('contains all three profiles', () => {
    const profiles = Object.keys(PROFILE_BUDGETS);
    expect(profiles).toEqual(['QUICK', 'SMART', 'DEEP']);
  });

  it('has valid maxUrls for all profiles', () => {
    expect(PROFILE_BUDGETS.QUICK.maxUrls).toBeGreaterThan(0);
    expect(PROFILE_BUDGETS.SMART.maxUrls).toBeGreaterThan(PROFILE_BUDGETS.QUICK.maxUrls);
    expect(PROFILE_BUDGETS.DEEP.maxUrls).toBeGreaterThan(PROFILE_BUDGETS.SMART.maxUrls);
  });

  it('has valid maxDuration for all profiles', () => {
    expect(PROFILE_BUDGETS.QUICK.maxDuration).toBeGreaterThan(0);
    expect(PROFILE_BUDGETS.SMART.maxDuration).toBeGreaterThan(PROFILE_BUDGETS.QUICK.maxDuration);
    expect(PROFILE_BUDGETS.DEEP.maxDuration).toBeGreaterThan(PROFILE_BUDGETS.SMART.maxDuration);
  });

  it('has sitemapFirst enabled for all profiles', () => {
    expect(PROFILE_BUDGETS.QUICK.sitemapFirst).toBe(true);
    expect(PROFILE_BUDGETS.SMART.sitemapFirst).toBe(true);
    expect(PROFILE_BUDGETS.DEEP.sitemapFirst).toBe(true);
  });
});

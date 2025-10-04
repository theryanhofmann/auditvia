/**
 * Budget Enforcement Tests (PR #3)
 * Tests for crawler budget limits and frontier caps
 */

import { getScanProfileConfig, PER_PAGE_URL_CAP, FRONTIER_CAP_MULTIPLIER } from '../scripts/crawler/pageCrawler'
import { PROFILE_BUDGETS } from '@/types/scan-profiles'

// Mock feature flags
jest.mock('@/lib/feature-flags', () => ({
  isScanProfilesEnabled: jest.fn(() => true),
  isEnterpriseGatingEnabled: jest.fn(() => true)
}))

describe('Budget Enforcement', () => {
  describe('getScanProfileConfig', () => {
    describe('with feature flags enabled', () => {
      it('should return QUICK profile config with budget', () => {
        const config = getScanProfileConfig('QUICK')

        expect(config.maxPages).toBe(PROFILE_BUDGETS.QUICK.maxUrls)
        expect(config.timeoutMs).toBe(PROFILE_BUDGETS.QUICK.maxDuration)
        expect(config.budget).toBeDefined()
        expect(config.budget?.maxUrls).toBe(50)
        expect(config.budget?.maxDuration).toBe(5 * 60 * 1000)
        expect(config.profile).toBe('QUICK')
      })

      it('should return SMART profile config with budget', () => {
        const config = getScanProfileConfig('SMART')

        expect(config.maxPages).toBe(PROFILE_BUDGETS.SMART.maxUrls)
        expect(config.timeoutMs).toBe(PROFILE_BUDGETS.SMART.maxDuration)
        expect(config.budget).toBeDefined()
        expect(config.budget?.maxUrls).toBe(150)
        expect(config.budget?.maxDuration).toBe(10 * 60 * 1000)
        expect(config.budget?.enterpriseDetectionThreshold).toBe(150)
        expect(config.profile).toBe('SMART')
      })

      it('should return DEEP profile config with budget', () => {
        const config = getScanProfileConfig('DEEP')

        expect(config.maxPages).toBe(PROFILE_BUDGETS.DEEP.maxUrls)
        expect(config.timeoutMs).toBe(PROFILE_BUDGETS.DEEP.maxDuration)
        expect(config.budget).toBeDefined()
        expect(config.budget?.maxUrls).toBe(1000)
        expect(config.budget?.maxDuration).toBe(30 * 60 * 1000)
        expect(config.budget?.resumable).toBe(true)
        expect(config.budget?.checkpointInterval).toBe(100)
        expect(config.profile).toBe('DEEP')
      })

      it('should include sameOriginOnly for all profiles', () => {
        expect(getScanProfileConfig('QUICK').sameOriginOnly).toBe(true)
        expect(getScanProfileConfig('SMART').sameOriginOnly).toBe(true)
        expect(getScanProfileConfig('DEEP').sameOriginOnly).toBe(true)
      })
    })

    describe('legacy profile support', () => {
      it('should support legacy "quick" profile', () => {
        const config = getScanProfileConfig('quick')

        // Should use legacy config when lowercase
        expect(config.maxPages).toBe(1)
        expect(config.timeoutMs).toBe(60000)
        expect(config.budget).toBeUndefined()
        expect(config.profile).toBeUndefined()
      })

      it('should support legacy "standard" profile', () => {
        const config = getScanProfileConfig('standard')

        expect(config.maxPages).toBe(3)
        expect(config.timeoutMs).toBe(120000)
        expect(config.budget).toBeUndefined()
      })

      it('should support legacy "deep" profile', () => {
        const config = getScanProfileConfig('deep')

        expect(config.maxPages).toBe(5)
        expect(config.timeoutMs).toBe(180000)
        expect(config.budget).toBeUndefined()
      })
    })
  })

  describe('Budget Constants', () => {
    it('should define PER_PAGE_URL_CAP', () => {
      expect(PER_PAGE_URL_CAP).toBe(30)
    })

    it('should define FRONTIER_CAP_MULTIPLIER', () => {
      expect(FRONTIER_CAP_MULTIPLIER).toBe(2)
    })

    it('should calculate correct frontier cap for QUICK', () => {
      const frontierCap = PROFILE_BUDGETS.QUICK.maxUrls * FRONTIER_CAP_MULTIPLIER
      expect(frontierCap).toBe(100) // 50 * 2
    })

    it('should calculate correct frontier cap for SMART', () => {
      const frontierCap = PROFILE_BUDGETS.SMART.maxUrls * FRONTIER_CAP_MULTIPLIER
      expect(frontierCap).toBe(300) // 150 * 2
    })

    it('should calculate correct frontier cap for DEEP', () => {
      const frontierCap = PROFILE_BUDGETS.DEEP.maxUrls * FRONTIER_CAP_MULTIPLIER
      expect(frontierCap).toBe(2000) // 1000 * 2
    })
  })

  describe('Profile Budget Validation', () => {
    it('should have valid QUICK budget', () => {
      const budget = PROFILE_BUDGETS.QUICK

      expect(budget.maxUrls).toBeGreaterThan(0)
      expect(budget.maxDuration).toBeGreaterThan(0)
      expect(budget.strategy).toBe('complete')
      expect(budget.sitemapFirst).toBe(true)
      expect(budget.priorityOrder).toContain('homepage')
      expect(budget.priorityOrder).toContain('navigation')
    })

    it('should have valid SMART budget', () => {
      const budget = PROFILE_BUDGETS.SMART

      expect(budget.maxUrls).toBeGreaterThan(PROFILE_BUDGETS.QUICK.maxUrls)
      expect(budget.maxDuration).toBeGreaterThan(PROFILE_BUDGETS.QUICK.maxDuration)
      expect(budget.strategy).toBe('priority-sampling')
      expect(budget.sitemapFirst).toBe(true)
      expect(budget.enterpriseDetectionThreshold).toBe(150)
    })

    it('should have valid DEEP budget', () => {
      const budget = PROFILE_BUDGETS.DEEP

      expect(budget.maxUrls).toBeGreaterThan(PROFILE_BUDGETS.SMART.maxUrls)
      expect(budget.maxDuration).toBeGreaterThan(PROFILE_BUDGETS.SMART.maxDuration)
      expect(budget.strategy).toBe('comprehensive')
      expect(budget.sitemapFirst).toBe(true)
      expect(budget.resumable).toBe(true)
      expect(budget.checkpointInterval).toBe(100)
    })

    it('should have ascending URL limits across profiles', () => {
      expect(PROFILE_BUDGETS.QUICK.maxUrls).toBeLessThan(PROFILE_BUDGETS.SMART.maxUrls)
      expect(PROFILE_BUDGETS.SMART.maxUrls).toBeLessThan(PROFILE_BUDGETS.DEEP.maxUrls)
    })

    it('should have ascending duration limits across profiles', () => {
      expect(PROFILE_BUDGETS.QUICK.maxDuration).toBeLessThan(PROFILE_BUDGETS.SMART.maxDuration)
      expect(PROFILE_BUDGETS.SMART.maxDuration).toBeLessThan(PROFILE_BUDGETS.DEEP.maxDuration)
    })
  })

  describe('Feature Flag Gating', () => {
    beforeEach(() => {
      jest.resetModules()
    })

    it('should fall back to legacy config when feature flags disabled', () => {
      jest.doMock('@/lib/feature-flags', () => ({
        isScanProfilesEnabled: jest.fn(() => false),
        isEnterpriseGatingEnabled: jest.fn(() => false)
      }))

      // Re-import after mocking
      const { getScanProfileConfig: getConfig } = require('../scripts/crawler/pageCrawler')

      const config = getConfig('QUICK')

      // Should use legacy fallback
      expect(config.budget).toBeUndefined()
      expect(config.profile).toBeUndefined()
    })
  })
})

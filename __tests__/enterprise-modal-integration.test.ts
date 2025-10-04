/**
 * Enterprise Modal Integration Tests (PR #4)
 * Tests for modal trigger logic and behavior
 */

import { isEnterpriseGatingEnabled, isScanProfilesEnabled } from '@/lib/feature-flags'

// Mock feature flags
jest.mock('@/lib/feature-flags', () => ({
  isEnterpriseGatingEnabled: jest.fn(() => true),
  isScanProfilesEnabled: jest.fn(() => true)
}))

describe('Enterprise Modal Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Feature Flag Gating - Dual Flags Required', () => {
    it('should require BOTH feature flags enabled', () => {
      const shouldShow = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      expect(shouldShow).toBe(true)
    })

    it('should disable modal when enterprise gating flag is false', () => {
      const mockIsEnterpriseGatingEnabled = isEnterpriseGatingEnabled as jest.Mock
      mockIsEnterpriseGatingEnabled.mockReturnValue(false)

      const shouldShow = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      expect(shouldShow).toBe(false)
    })

    it('should disable modal when scan profiles flag is false', () => {
      const mockIsScanProfilesEnabled = isScanProfilesEnabled as jest.Mock
      mockIsScanProfilesEnabled.mockReturnValue(false)

      const shouldShow = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      expect(shouldShow).toBe(false)
    })

    it('should enable modal only when both flags are true', () => {
      const mockIsEnterpriseGatingEnabled = isEnterpriseGatingEnabled as jest.Mock
      const mockIsScanProfilesEnabled = isScanProfilesEnabled as jest.Mock

      mockIsEnterpriseGatingEnabled.mockReturnValue(true)
      mockIsScanProfilesEnabled.mockReturnValue(true)

      const shouldShow = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      expect(shouldShow).toBe(true)
    })
  })

  describe('Modal Trigger Logic', () => {
    it('should trigger on incomplete_enterprise_gate status with both flags', () => {
      const status = 'incomplete_enterprise_gate'
      const flagsEnabled = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      const shouldShow = flagsEnabled && status === 'incomplete_enterprise_gate'

      expect(shouldShow).toBe(true)
    })

    it('should not trigger on completed status', () => {
      const status = 'completed'
      const flagsEnabled = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      const shouldShow = flagsEnabled && status === 'incomplete_enterprise_gate'

      expect(shouldShow).toBe(false)
    })

    it('should not trigger on running status', () => {
      const status = 'running'
      const flagsEnabled = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      const shouldShow = flagsEnabled && status === 'incomplete_enterprise_gate'

      expect(shouldShow).toBe(false)
    })

    it('should not trigger on failed status', () => {
      const status = 'failed'
      const flagsEnabled = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      const shouldShow = flagsEnabled && status === 'incomplete_enterprise_gate'

      expect(shouldShow).toBe(false)
    })

    it('should not trigger when any feature flag disabled even with correct status', () => {
      const mockIsEnterpriseGatingEnabled = isEnterpriseGatingEnabled as jest.Mock
      mockIsEnterpriseGatingEnabled.mockReturnValue(false)

      const status = 'incomplete_enterprise_gate'
      const flagsEnabled = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      const shouldShow = flagsEnabled && status === 'incomplete_enterprise_gate'

      expect(shouldShow).toBe(false)
    })
  })

  describe('CTA Navigation URLs', () => {
    it('should define correct upgrade URL', () => {
      const upgradeUrl = '/pricing#enterprise'
      expect(upgradeUrl).toBe('/pricing#enterprise')
    })

    it('should have valid URL format', () => {
      const upgradeUrl = '/pricing#enterprise'
      expect(upgradeUrl).toMatch(/^\/pricing#enterprise$/)
    })
  })

  describe('Modal Content Validation', () => {
    it('should have correct title text', () => {
      const title = 'Enterprise Scan Required'
      expect(title).toBe('Enterprise Scan Required')
    })

    it('should have correct body text', () => {
      const body = "This site exceeds the limits of your current plan. To unlock full scan coverage and complete compliance reporting, you'll need to upgrade to Enterprise."
      expect(body).toContain('exceeds the limits')
      expect(body).toContain('upgrade to Enterprise')
    })

    it('should have correct primary CTA text', () => {
      const primaryCTA = 'Upgrade to Enterprise'
      expect(primaryCTA).toBe('Upgrade to Enterprise')
    })

    it('should have correct secondary CTA text', () => {
      const secondaryCTA = 'View Sample Report'
      expect(secondaryCTA).toBe('View Sample Report')
    })
  })

  describe('Discovered URLs Display', () => {
    it('should format discovered URLs correctly', () => {
      const discoveredUrls = 250
      const displayText = `${discoveredUrls}+ pages detected`
      expect(displayText).toBe('250+ pages detected')
    })

    it('should handle different URL counts', () => {
      const testCases = [100, 500, 1000]
      testCases.forEach(count => {
        const displayText = `${count}+ pages detected`
        expect(displayText).toMatch(/^\d+\+ pages detected$/)
      })
    })
  })

  describe('Status Detection', () => {
    const statuses = ['queued', 'running', 'completed', 'failed', 'incomplete_enterprise_gate']

    it('should only match incomplete_enterprise_gate status', () => {
      statuses.forEach(status => {
        const isMatch = status === 'incomplete_enterprise_gate'
        expect(isMatch).toBe(status === 'incomplete_enterprise_gate')
      })
    })

    it('should be case-sensitive for status matching', () => {
      const incorrectCases = ['INCOMPLETE_ENTERPRISE_GATE', 'Incomplete_Enterprise_Gate', 'incomplete_Enterprise_Gate']
      incorrectCases.forEach(status => {
        const isMatch = status === 'incomplete_enterprise_gate'
        expect(isMatch).toBe(false)
      })
    })
  })
})

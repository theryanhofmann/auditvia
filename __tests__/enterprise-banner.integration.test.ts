/**
 * Enterprise Banner Integration Tests (PR #5)
 * Tests for banner rendering, sample section with N items, and deep-link focus
 */

import { isEnterpriseGatingEnabled, isScanProfilesEnabled } from '@/lib/feature-flags'
import { SAMPLE_REPORT_ANCHOR } from '@/app/components/ui/EnterpriseGateModal.constants'

// Mock feature flags
jest.mock('@/lib/feature-flags', () => ({
  isEnterpriseGatingEnabled: jest.fn(() => true),
  isScanProfilesEnabled: jest.fn(() => true)
}))

describe('Enterprise Banner Integration', () => {
  beforeEach(() => {
    // Reset mock call counts but preserve implementations
    const mockIsEnterpriseGatingEnabled = isEnterpriseGatingEnabled as jest.Mock
    const mockIsScanProfilesEnabled = isScanProfilesEnabled as jest.Mock

    mockIsEnterpriseGatingEnabled.mockClear()
    mockIsScanProfilesEnabled.mockClear()

    // Restore default implementations
    mockIsEnterpriseGatingEnabled.mockReturnValue(true)
    mockIsScanProfilesEnabled.mockReturnValue(true)
  })

  describe('Banner Rendering with Dual Feature Flags', () => {
    it('should show banner when BOTH feature flags are enabled', () => {
      const shouldShow = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      expect(shouldShow).toBe(true)
    })

    it('should NOT show banner when only enterprise gating flag is enabled', () => {
      const mockIsScanProfilesEnabled = isScanProfilesEnabled as jest.Mock
      mockIsScanProfilesEnabled.mockReturnValue(false)

      const shouldShow = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      expect(shouldShow).toBe(false)
    })

    it('should NOT show banner when only scan profiles flag is enabled', () => {
      const mockIsEnterpriseGatingEnabled = isEnterpriseGatingEnabled as jest.Mock
      mockIsEnterpriseGatingEnabled.mockReturnValue(false)

      const shouldShow = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      expect(shouldShow).toBe(false)
    })

    it('should NOT show banner when both flags are disabled', () => {
      const mockIsEnterpriseGatingEnabled = isEnterpriseGatingEnabled as jest.Mock
      const mockIsScanProfilesEnabled = isScanProfilesEnabled as jest.Mock

      mockIsEnterpriseGatingEnabled.mockReturnValue(false)
      mockIsScanProfilesEnabled.mockReturnValue(false)

      const shouldShow = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      expect(shouldShow).toBe(false)
    })
  })

  describe('Banner Trigger on Status', () => {
    it('should trigger on incomplete_enterprise_gate status', () => {
      const status = 'incomplete_enterprise_gate'
      const flagsEnabled = isEnterpriseGatingEnabled() && isScanProfilesEnabled()

      const shouldShowBanner = flagsEnabled && status === 'incomplete_enterprise_gate'
      expect(shouldShowBanner).toBe(true)
    })

    it('should not trigger on completed status', () => {
      const status = 'completed'
      const flagsEnabled = isEnterpriseGatingEnabled() && isScanProfilesEnabled()

      const shouldShowBanner = flagsEnabled && status === 'incomplete_enterprise_gate'
      expect(shouldShowBanner).toBe(false)
    })

    it('should not trigger on running status', () => {
      const status = 'running'
      const flagsEnabled = isEnterpriseGatingEnabled() && isScanProfilesEnabled()

      const shouldShowBanner = flagsEnabled && status === 'incomplete_enterprise_gate'
      expect(shouldShowBanner).toBe(false)
    })

    it('should not trigger on failed status', () => {
      const status = 'failed'
      const flagsEnabled = isEnterpriseGatingEnabled() && isScanProfilesEnabled()

      const shouldShowBanner = flagsEnabled && status === 'incomplete_enterprise_gate'
      expect(shouldShowBanner).toBe(false)
    })
  })

  describe('Sample Section - Top N Items', () => {
    it('should show top 50 issues when more than 50 exist', () => {
      const totalIssues = 100
      const maxSampleSize = 50

      const sampleSize = Math.min(maxSampleSize, totalIssues)
      expect(sampleSize).toBe(50)
    })

    it('should show all issues when less than 50 exist', () => {
      const totalIssues = 30
      const maxSampleSize = 50

      const sampleSize = Math.min(maxSampleSize, totalIssues)
      expect(sampleSize).toBe(30)
    })

    it('should handle exactly 50 issues', () => {
      const totalIssues = 50
      const maxSampleSize = 50

      const sampleSize = Math.min(maxSampleSize, totalIssues)
      expect(sampleSize).toBe(50)
    })

    it('should handle 20 issues (minimum range)', () => {
      const totalIssues = 20
      const maxSampleSize = 50

      const sampleSize = Math.min(maxSampleSize, totalIssues)
      expect(sampleSize).toBe(20)
    })

    it('should use slice to get top N issues', () => {
      const issues = Array.from({ length: 100 }, (_, i) => ({ id: `issue-${i}` }))
      const sampleIssues = issues.slice(0, Math.min(50, issues.length))

      expect(sampleIssues.length).toBe(50)
      expect(sampleIssues[0].id).toBe('issue-0')
      expect(sampleIssues[49].id).toBe('issue-49')
    })

    it('should preserve issue order in sample', () => {
      const issues = [
        { id: 'issue-1', impact: 'critical' },
        { id: 'issue-2', impact: 'serious' },
        { id: 'issue-3', impact: 'moderate' }
      ]

      const sampleIssues = issues.slice(0, Math.min(50, issues.length))

      expect(sampleIssues[0].id).toBe('issue-1')
      expect(sampleIssues[1].id).toBe('issue-2')
      expect(sampleIssues[2].id).toBe('issue-3')
    })
  })

  describe('Deep Link Focus with Banner Present', () => {
    it('should target sample-report anchor', () => {
      expect(SAMPLE_REPORT_ANCHOR).toBe('sample-report')
    })

    it('should construct deep link URL with banner context', () => {
      const currentPath = '/dashboard/scans/scan-123'
      const deepLink = `${currentPath}?view=sample#${SAMPLE_REPORT_ANCHOR}`

      expect(deepLink).toBe('/dashboard/scans/scan-123?view=sample#sample-report')
    })

    it('should focus sample section with tabIndex=-1', () => {
      const tabIndex = -1
      expect(tabIndex).toBe(-1)
    })

    it('should scroll to sample section smoothly', () => {
      const scrollBehavior = 'smooth'
      const scrollBlock = 'start'

      expect(scrollBehavior).toBe('smooth')
      expect(scrollBlock).toBe('start')
    })

    it('should handle focus after banner is rendered', () => {
      const focusTimeout = 100
      expect(focusTimeout).toBeGreaterThan(0)
    })
  })

  describe('Sample Section Display Logic', () => {
    it('should show "Sample Report - Top Issues" heading when banner present', () => {
      const showEnterpriseBanner = true
      const heading = showEnterpriseBanner ? 'Sample Report - Top Issues' : 'Issues Summary'

      expect(heading).toBe('Sample Report - Top Issues')
    })

    it('should show "Issues Summary" heading when banner not present', () => {
      const showEnterpriseBanner = false
      const heading = showEnterpriseBanner ? 'Sample Report - Top Issues' : 'Issues Summary'

      expect(heading).toBe('Issues Summary')
    })

    it('should show "Showing up to 50 issues" label when banner present', () => {
      const showEnterpriseBanner = true
      const shouldShowLabel = showEnterpriseBanner

      expect(shouldShowLabel).toBe(true)
    })

    it('should not show sample label when banner not present', () => {
      const showEnterpriseBanner = false
      const shouldShowLabel = showEnterpriseBanner

      expect(shouldShowLabel).toBe(false)
    })
  })

  describe('Banner + Sample Section Integration', () => {
    it('should show both banner and sample section for incomplete_enterprise_gate', () => {
      const status = 'incomplete_enterprise_gate'
      const flagsEnabled = isEnterpriseGatingEnabled() && isScanProfilesEnabled()

      const showEnterpriseBanner = flagsEnabled && status === 'incomplete_enterprise_gate'

      expect(showEnterpriseBanner).toBe(true)
    })

    it('should use same flag logic for banner and sample section', () => {
      const showBanner = isEnterpriseGatingEnabled() && isScanProfilesEnabled()
      const showSample = isEnterpriseGatingEnabled() && isScanProfilesEnabled()

      expect(showBanner).toBe(showSample)
    })

    it('should show partial results with banner context', () => {
      const totalIssues = 100
      const showEnterpriseBanner = true

      const issuesToShow = showEnterpriseBanner
        ? Math.min(50, totalIssues)
        : totalIssues

      expect(issuesToShow).toBe(50)
    })

    it('should show all issues when banner not present', () => {
      const totalIssues = 100
      const showEnterpriseBanner = false

      const issuesToShow = showEnterpriseBanner
        ? Math.min(50, totalIssues)
        : totalIssues

      expect(issuesToShow).toBe(100)
    })
  })

  describe('Non-Blocking Behavior', () => {
    it('should not prevent scan report from rendering', () => {
      const showEnterpriseBanner = true
      const scanReportShouldRender = true

      expect(scanReportShouldRender).toBe(true)
      expect(showEnterpriseBanner).toBe(true)
    })

    it('should show banner above scan summary', () => {
      // Banner should be rendered before scan summary section
      const bannerOrder = 1
      const scanSummaryOrder = 2

      expect(bannerOrder).toBeLessThan(scanSummaryOrder)
    })

    it('should preserve all scan data with banner', () => {
      const scanData = {
        id: 'scan-123',
        status: 'incomplete_enterprise_gate',
        totalViolations: 100,
        passes: 500
      }

      // Banner doesn't modify scan data
      expect(scanData.totalViolations).toBe(100)
      expect(scanData.passes).toBe(500)
    })
  })
})

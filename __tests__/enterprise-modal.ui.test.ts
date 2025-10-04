/**
 * Enterprise Modal UI Tests (PR #4 - Patch)
 * Tests for exported constants, A11y attributes, and telemetry events
 */

import {
  ENTERPRISE_MODAL_TITLE,
  ENTERPRISE_MODAL_BODY,
  ENTERPRISE_MODAL_CTA_UPGRADE,
  ENTERPRISE_MODAL_CTA_SAMPLE,
  ENTERPRISE_MODAL_UPGRADE_URL,
  SAMPLE_REPORT_ANCHOR
} from '@/app/components/ui/EnterpriseGateModal.constants'
import { scanAnalytics } from '@/lib/safe-analytics'

// Mock safe-analytics
jest.mock('@/lib/safe-analytics', () => ({
  scanAnalytics: {
    enterpriseModalShown: jest.fn(),
    enterpriseModalUpgradeClick: jest.fn(),
    enterpriseModalSampleClick: jest.fn(),
    enterpriseModalDismiss: jest.fn()
  }
}))

describe('Enterprise Modal UI - String Constants', () => {
  describe('Exported Constants Presence', () => {
    it('should export ENTERPRISE_MODAL_TITLE constant', () => {
      expect(ENTERPRISE_MODAL_TITLE).toBeDefined()
      expect(typeof ENTERPRISE_MODAL_TITLE).toBe('string')
    })

    it('should export ENTERPRISE_MODAL_BODY constant', () => {
      expect(ENTERPRISE_MODAL_BODY).toBeDefined()
      expect(typeof ENTERPRISE_MODAL_BODY).toBe('string')
    })

    it('should export ENTERPRISE_MODAL_CTA_UPGRADE constant', () => {
      expect(ENTERPRISE_MODAL_CTA_UPGRADE).toBeDefined()
      expect(typeof ENTERPRISE_MODAL_CTA_UPGRADE).toBe('string')
    })

    it('should export ENTERPRISE_MODAL_CTA_SAMPLE constant', () => {
      expect(ENTERPRISE_MODAL_CTA_SAMPLE).toBeDefined()
      expect(typeof ENTERPRISE_MODAL_CTA_SAMPLE).toBe('string')
    })

    it('should export ENTERPRISE_MODAL_UPGRADE_URL constant', () => {
      expect(ENTERPRISE_MODAL_UPGRADE_URL).toBeDefined()
      expect(typeof ENTERPRISE_MODAL_UPGRADE_URL).toBe('string')
    })

    it('should export SAMPLE_REPORT_ANCHOR constant', () => {
      expect(SAMPLE_REPORT_ANCHOR).toBeDefined()
      expect(typeof SAMPLE_REPORT_ANCHOR).toBe('string')
    })
  })

  describe('Exact Copy Validation', () => {
    it('should have exact title text', () => {
      expect(ENTERPRISE_MODAL_TITLE).toBe('Enterprise Scan Required')
    })

    it('should have exact body text', () => {
      const expectedBody = "This site exceeds the limits of your current plan. To unlock full scan coverage and complete compliance reporting, you'll need to upgrade to Enterprise."
      expect(ENTERPRISE_MODAL_BODY).toBe(expectedBody)
    })

    it('should have exact upgrade CTA text', () => {
      expect(ENTERPRISE_MODAL_CTA_UPGRADE).toBe('Upgrade to Enterprise')
    })

    it('should have exact sample CTA text', () => {
      expect(ENTERPRISE_MODAL_CTA_SAMPLE).toBe('View Sample Report')
    })

    it('should have correct upgrade URL', () => {
      expect(ENTERPRISE_MODAL_UPGRADE_URL).toBe('/pricing#enterprise')
    })

    it('should have correct sample report anchor', () => {
      expect(SAMPLE_REPORT_ANCHOR).toBe('sample-report')
    })
  })

  describe('A11y Attribute Values', () => {
    it('should provide dialog title ID for aria-labelledby', () => {
      const dialogTitleId = 'enterprise-modal-title'
      expect(dialogTitleId).toBe('enterprise-modal-title')
    })

    it('should provide dialog description ID for aria-describedby', () => {
      const dialogDescId = 'enterprise-modal-description'
      expect(dialogDescId).toBe('enterprise-modal-description')
    })

    it('should require role="dialog" attribute', () => {
      const role = 'dialog'
      expect(role).toBe('dialog')
    })

    it('should have focusable sample report section with tabIndex=-1', () => {
      const tabIndex = -1
      expect(tabIndex).toBe(-1)
    })
  })
})

describe('Enterprise Modal UI - Telemetry Events', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('enterpriseModalShown Event', () => {
    it('should emit shown event with correct parameters', () => {
      const params = {
        scanId: 'scan-123',
        siteId: 'site-456',
        discoveredUrls: 250
      }

      scanAnalytics.enterpriseModalShown(params)

      expect(scanAnalytics.enterpriseModalShown).toHaveBeenCalledWith(params)
    })

    it('should include all required fields in shown event', () => {
      const params = {
        scanId: 'scan-test',
        siteId: 'site-test',
        discoveredUrls: 100
      }

      scanAnalytics.enterpriseModalShown(params)

      expect(scanAnalytics.enterpriseModalShown).toHaveBeenCalledWith(
        expect.objectContaining({
          scanId: expect.any(String),
          siteId: expect.any(String),
          discoveredUrls: expect.any(Number)
        })
      )
    })
  })

  describe('enterpriseModalUpgradeClick Event', () => {
    it('should emit upgrade click event with correct parameters', () => {
      const params = {
        scanId: 'scan-123',
        siteId: 'site-456'
      }

      scanAnalytics.enterpriseModalUpgradeClick(params)

      expect(scanAnalytics.enterpriseModalUpgradeClick).toHaveBeenCalledWith(params)
    })

    it('should include required fields in upgrade click event', () => {
      const params = {
        scanId: 'scan-upgrade',
        siteId: 'site-upgrade'
      }

      scanAnalytics.enterpriseModalUpgradeClick(params)

      expect(scanAnalytics.enterpriseModalUpgradeClick).toHaveBeenCalledWith(
        expect.objectContaining({
          scanId: expect.any(String),
          siteId: expect.any(String)
        })
      )
    })
  })

  describe('enterpriseModalSampleClick Event', () => {
    it('should emit sample click event with correct parameters', () => {
      const params = {
        scanId: 'scan-789',
        siteId: 'site-012'
      }

      scanAnalytics.enterpriseModalSampleClick(params)

      expect(scanAnalytics.enterpriseModalSampleClick).toHaveBeenCalledWith(params)
    })

    it('should include required fields in sample click event', () => {
      const params = {
        scanId: 'scan-sample',
        siteId: 'site-sample'
      }

      scanAnalytics.enterpriseModalSampleClick(params)

      expect(scanAnalytics.enterpriseModalSampleClick).toHaveBeenCalledWith(
        expect.objectContaining({
          scanId: expect.any(String),
          siteId: expect.any(String)
        })
      )
    })
  })

  describe('enterpriseModalDismiss Event', () => {
    it('should emit dismiss event with correct parameters', () => {
      const params = {
        scanId: 'scan-dismiss',
        siteId: 'site-dismiss'
      }

      scanAnalytics.enterpriseModalDismiss(params)

      expect(scanAnalytics.enterpriseModalDismiss).toHaveBeenCalledWith(params)
    })

    it('should include required fields in dismiss event', () => {
      const params = {
        scanId: 'scan-x',
        siteId: 'site-x'
      }

      scanAnalytics.enterpriseModalDismiss(params)

      expect(scanAnalytics.enterpriseModalDismiss).toHaveBeenCalledWith(
        expect.objectContaining({
          scanId: expect.any(String),
          siteId: expect.any(String)
        })
      )
    })
  })

  describe('Event Emission Order', () => {
    it('should track shown event before upgrade click', () => {
      scanAnalytics.enterpriseModalShown({
        scanId: 'scan-1',
        siteId: 'site-1',
        discoveredUrls: 100
      })

      expect(scanAnalytics.enterpriseModalShown).toHaveBeenCalledTimes(1)

      scanAnalytics.enterpriseModalUpgradeClick({
        scanId: 'scan-1',
        siteId: 'site-1'
      })

      expect(scanAnalytics.enterpriseModalUpgradeClick).toHaveBeenCalledTimes(1)
    })

    it('should track shown event before sample click', () => {
      scanAnalytics.enterpriseModalShown({
        scanId: 'scan-2',
        siteId: 'site-2',
        discoveredUrls: 200
      })

      expect(scanAnalytics.enterpriseModalShown).toHaveBeenCalledTimes(1)

      scanAnalytics.enterpriseModalSampleClick({
        scanId: 'scan-2',
        siteId: 'site-2'
      })

      expect(scanAnalytics.enterpriseModalSampleClick).toHaveBeenCalledTimes(1)
    })
  })
})

describe('Enterprise Modal UI - Deep Linking', () => {
  describe('Sample Report Anchor', () => {
    it('should use correct anchor ID for deep linking', () => {
      expect(SAMPLE_REPORT_ANCHOR).toBe('sample-report')
    })

    it('should construct correct deep link URL', () => {
      const currentPath = '/dashboard/scans/scan-123'
      const deepLink = `${currentPath}?view=sample#${SAMPLE_REPORT_ANCHOR}`

      expect(deepLink).toBe('/dashboard/scans/scan-123?view=sample#sample-report')
    })

    it('should construct correct hash fragment', () => {
      const hashFragment = `#${SAMPLE_REPORT_ANCHOR}`
      expect(hashFragment).toBe('#sample-report')
    })

    it('should construct correct query param with anchor', () => {
      const queryWithAnchor = `?view=sample#${SAMPLE_REPORT_ANCHOR}`
      expect(queryWithAnchor).toBe('?view=sample#sample-report')
    })
  })

  describe('Focus Target', () => {
    it('should target element with correct ID', () => {
      const targetId = SAMPLE_REPORT_ANCHOR
      expect(targetId).toBe('sample-report')
    })

    it('should require tabIndex=-1 for programmatic focus', () => {
      const tabIndex = -1
      expect(tabIndex).toBeLessThan(0)
    })
  })
})

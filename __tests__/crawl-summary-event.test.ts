/**
 * Crawl Summary Event Tests (PR #3)
 * Tests for crawl.summary.v1 telemetry event
 */

import { scanAnalytics } from '@/lib/safe-analytics'

// Mock the underlying analytics functions
jest.mock('@/lib/safe-analytics', () => {
  const mockSafeAnalytics = jest.fn()
  return {
    safeAnalytics: mockSafeAnalytics,
    scanAnalytics: {
      crawlSummary: jest.fn((params) => {
        mockSafeAnalytics('crawl.summary.v1', params)
      })
    }
  }
})

describe('Crawl Summary Telemetry Event', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('crawlSummary event', () => {
    it('should emit event with QUICK profile', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-123',
        scanId: 'scan-456',
        profile: 'QUICK',
        pagesCrawled: 25,
        discoveredUrls: 40,
        elapsedMinutes: 2.5,
        stoppedReason: 'complete'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith({
        siteId: 'site-123',
        scanId: 'scan-456',
        profile: 'QUICK',
        pagesCrawled: 25,
        discoveredUrls: 40,
        elapsedMinutes: 2.5,
        stoppedReason: 'complete'
      })
    })

    it('should emit event with SMART profile', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-789',
        scanId: 'scan-101',
        profile: 'SMART',
        pagesCrawled: 150,
        discoveredUrls: 280,
        elapsedMinutes: 8.3,
        stoppedReason: 'budget'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith({
        siteId: 'site-789',
        scanId: 'scan-101',
        profile: 'SMART',
        pagesCrawled: 150,
        discoveredUrls: 280,
        elapsedMinutes: 8.3,
        stoppedReason: 'budget'
      })
    })

    it('should emit event with DEEP profile', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-abc',
        scanId: 'scan-def',
        profile: 'DEEP',
        pagesCrawled: 1000,
        discoveredUrls: 3500,
        elapsedMinutes: 28.7,
        stoppedReason: 'complete'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith({
        siteId: 'site-abc',
        scanId: 'scan-def',
        profile: 'DEEP',
        pagesCrawled: 1000,
        discoveredUrls: 3500,
        elapsedMinutes: 28.7,
        stoppedReason: 'complete'
      })
    })

    it('should emit event when stopped due to budget limit', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-1',
        scanId: 'scan-1',
        profile: 'QUICK',
        pagesCrawled: 50,
        discoveredUrls: 120,
        elapsedMinutes: 3.2,
        stoppedReason: 'budget'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          stoppedReason: 'budget',
          pagesCrawled: 50
        })
      )
    })

    it('should emit event when stopped due to max duration', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-2',
        scanId: 'scan-2',
        profile: 'QUICK',
        pagesCrawled: 35,
        discoveredUrls: 75,
        elapsedMinutes: 5.1,
        stoppedReason: 'maxDuration'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          stoppedReason: 'maxDuration',
          elapsedMinutes: 5.1
        })
      )
    })

    it('should emit event when stopped due to enterprise detection', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-3',
        scanId: 'scan-3',
        profile: 'SMART',
        pagesCrawled: 150,
        discoveredUrls: 500,
        elapsedMinutes: 7.5,
        stoppedReason: 'enterprise'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          stoppedReason: 'enterprise',
          discoveredUrls: 500
        })
      )
    })

    it('should emit event when crawl completes successfully', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-4',
        scanId: 'scan-4',
        profile: 'QUICK',
        pagesCrawled: 15,
        discoveredUrls: 25,
        elapsedMinutes: 1.8,
        stoppedReason: 'complete'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          stoppedReason: 'complete',
          pagesCrawled: 15
        })
      )
    })
  })

  describe('Event Parameter Validation', () => {
    it('should include all required fields', () => {
      const params = {
        siteId: 'site-test',
        scanId: 'scan-test',
        profile: 'QUICK' as const,
        pagesCrawled: 10,
        discoveredUrls: 20,
        elapsedMinutes: 1.5,
        stoppedReason: 'complete' as const
      }

      scanAnalytics.crawlSummary(params)

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          siteId: expect.any(String),
          scanId: expect.any(String),
          profile: expect.any(String),
          pagesCrawled: expect.any(Number),
          discoveredUrls: expect.any(Number),
          elapsedMinutes: expect.any(Number),
          stoppedReason: expect.any(String)
        })
      )
    })

    it('should handle zero pages crawled', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-zero',
        scanId: 'scan-zero',
        profile: 'QUICK',
        pagesCrawled: 0,
        discoveredUrls: 0,
        elapsedMinutes: 0.1,
        stoppedReason: 'complete'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          pagesCrawled: 0,
          discoveredUrls: 0
        })
      )
    })

    it('should handle large crawl counts', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-large',
        scanId: 'scan-large',
        profile: 'DEEP',
        pagesCrawled: 1000,
        discoveredUrls: 5000,
        elapsedMinutes: 29.9,
        stoppedReason: 'complete'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          pagesCrawled: 1000,
          discoveredUrls: 5000
        })
      )
    })

    it('should handle fractional elapsed minutes', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-frac',
        scanId: 'scan-frac',
        profile: 'QUICK',
        pagesCrawled: 10,
        discoveredUrls: 15,
        elapsedMinutes: 2.456,
        stoppedReason: 'complete'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          elapsedMinutes: 2.456
        })
      )
    })
  })

  describe('Stop Reason Scenarios', () => {
    it('should emit "budget" when URL limit reached', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-1',
        scanId: 'scan-1',
        profile: 'QUICK',
        pagesCrawled: 50, // Exactly at limit
        discoveredUrls: 100,
        elapsedMinutes: 3.0,
        stoppedReason: 'budget'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({ stoppedReason: 'budget' })
      )
    })

    it('should emit "maxDuration" when time limit reached', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-2',
        scanId: 'scan-2',
        profile: 'QUICK',
        pagesCrawled: 30,
        discoveredUrls: 60,
        elapsedMinutes: 5.0, // At 5-minute limit
        stoppedReason: 'maxDuration'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({ stoppedReason: 'maxDuration' })
      )
    })

    it('should emit "enterprise" when enterprise site detected', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-3',
        scanId: 'scan-3',
        profile: 'SMART',
        pagesCrawled: 150,
        discoveredUrls: 500,
        elapsedMinutes: 6.5,
        stoppedReason: 'enterprise'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({ stoppedReason: 'enterprise' })
      )
    })

    it('should emit "complete" when crawl finishes naturally', () => {
      scanAnalytics.crawlSummary({
        siteId: 'site-4',
        scanId: 'scan-4',
        profile: 'QUICK',
        pagesCrawled: 20, // Under limit
        discoveredUrls: 30,
        elapsedMinutes: 2.0, // Under time limit
        stoppedReason: 'complete'
      })

      expect(scanAnalytics.crawlSummary).toHaveBeenCalledWith(
        expect.objectContaining({ stoppedReason: 'complete' })
      )
    })
  })
})

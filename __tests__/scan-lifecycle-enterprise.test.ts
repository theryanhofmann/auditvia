/**
 * Unit Tests: Scan Lifecycle Manager - Enterprise Detection Integration
 *
 * Tests for checkEnterpriseDetection method and feature flag gating.
 *
 * @see /docs/tech/scan-profiles-spec.md#runner-integration
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies before importing
jest.mock('@/lib/enterprise-detection');
jest.mock('@/lib/feature-flags');
jest.mock('@/lib/safe-analytics');

describe('ScanLifecycleManager - Enterprise Detection', () => {
  let mockDetectEnterprise: jest.MockedFunction<any>;
  let mockIsEnterpriseGatingEnabled: jest.MockedFunction<any>;
  let mockIsScanProfilesEnabled: jest.MockedFunction<any>;
  let mockEnterpriseDetectedAnalytics: jest.MockedFunction<any>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Get mocked functions
    const enterpriseDetection = require('@/lib/enterprise-detection');
    const featureFlags = require('@/lib/feature-flags');
    const safeAnalytics = require('@/lib/safe-analytics');

    mockDetectEnterprise = enterpriseDetection.detectEnterprise as jest.MockedFunction<any>;
    mockIsEnterpriseGatingEnabled = featureFlags.isEnterpriseGatingEnabled as jest.MockedFunction<any>;
    mockIsScanProfilesEnabled = featureFlags.isScanProfilesEnabled as jest.MockedFunction<any>;
    mockEnterpriseDetectedAnalytics = safeAnalytics.scanAnalytics.enterpriseDetected as jest.MockedFunction<any>;
  });

  describe('Feature Flag Gating', () => {
    it('skips detection when scan profiles flag is false', async () => {
      mockIsScanProfilesEnabled.mockReturnValue(false);
      mockIsEnterpriseGatingEnabled.mockReturnValue(true);

      const { ScanLifecycleManager } = await import('@/lib/scan-lifecycle-manager');
      const manager = new ScanLifecycleManager({ enableAnalytics: false });

      const result = await manager.checkEnterpriseDetection('scan-123', 'site-456', {
        discoveredUrls: 200,
        elapsedMinutes: 6,
        frontierGrowing: true,
      });

      expect(result.shouldStop).toBe(false);
      expect(mockDetectEnterprise).not.toHaveBeenCalled();
    });

    it('skips detection when enterprise gating flag is false', async () => {
      mockIsScanProfilesEnabled.mockReturnValue(true);
      mockIsEnterpriseGatingEnabled.mockReturnValue(false);

      const { ScanLifecycleManager } = await import('@/lib/scan-lifecycle-manager');
      const manager = new ScanLifecycleManager({ enableAnalytics: false });

      const result = await manager.checkEnterpriseDetection('scan-123', 'site-456', {
        discoveredUrls: 200,
        elapsedMinutes: 6,
        frontierGrowing: true,
      });

      expect(result.shouldStop).toBe(false);
      expect(mockDetectEnterprise).not.toHaveBeenCalled();
    });

    it('runs detection when both flags are true', async () => {
      mockIsScanProfilesEnabled.mockReturnValue(true);
      mockIsEnterpriseGatingEnabled.mockReturnValue(true);
      mockDetectEnterprise.mockReturnValue({
        isEnterprise: false,
        reason: null,
      });

      const { ScanLifecycleManager } = await import('@/lib/scan-lifecycle-manager');
      const manager = new ScanLifecycleManager({ enableAnalytics: false });

      const result = await manager.checkEnterpriseDetection('scan-123', 'site-456', {
        discoveredUrls: 100,
        elapsedMinutes: 3,
        frontierGrowing: false,
      });

      expect(result.shouldStop).toBe(false);
      expect(mockDetectEnterprise).toHaveBeenCalledWith({
        discoveredUrls: 100,
        elapsedMinutes: 3,
        frontierGrowing: false,
      });
    });
  });

  describe('Enterprise Detection Behavior', () => {
    beforeEach(() => {
      // Enable both flags for these tests
      mockIsScanProfilesEnabled.mockReturnValue(true);
      mockIsEnterpriseGatingEnabled.mockReturnValue(true);
    });

    it('returns shouldStop=false when not enterprise', async () => {
      mockDetectEnterprise.mockReturnValue({
        isEnterprise: false,
        reason: null,
      });

      const { ScanLifecycleManager } = await import('@/lib/scan-lifecycle-manager');
      const manager = new ScanLifecycleManager({ enableAnalytics: false });

      const result = await manager.checkEnterpriseDetection('scan-123', 'site-456', {
        discoveredUrls: 100,
        elapsedMinutes: 3,
        frontierGrowing: false,
      });

      expect(result.shouldStop).toBe(false);
      expect(result.reason).toBeUndefined();
    });

    it('returns shouldStop=true when enterprise detected via URL threshold', async () => {
      mockDetectEnterprise.mockReturnValue({
        isEnterprise: true,
        reason: 'url_threshold',
      });

      const { ScanLifecycleManager } = await import('@/lib/scan-lifecycle-manager');
      const manager = new ScanLifecycleManager({ enableAnalytics: false });

      const result = await manager.checkEnterpriseDetection('scan-123', 'site-456', {
        discoveredUrls: 200,
        elapsedMinutes: 3,
        frontierGrowing: false,
      });

      expect(result.shouldStop).toBe(true);
      expect(result.reason).toBe('url_threshold');
    });

    it('returns shouldStop=true when enterprise detected via time+frontier', async () => {
      mockDetectEnterprise.mockReturnValue({
        isEnterprise: true,
        reason: 'time_frontier',
      });

      const { ScanLifecycleManager } = await import('@/lib/scan-lifecycle-manager');
      const manager = new ScanLifecycleManager({ enableAnalytics: false });

      const result = await manager.checkEnterpriseDetection('scan-123', 'site-456', {
        discoveredUrls: 120,
        elapsedMinutes: 7,
        frontierGrowing: true,
      });

      expect(result.shouldStop).toBe(true);
      expect(result.reason).toBe('time_frontier');
    });

    it('emits telemetry event when enterprise detected', async () => {
      mockDetectEnterprise.mockReturnValue({
        isEnterprise: true,
        reason: 'url_threshold',
      });
      mockEnterpriseDetectedAnalytics.mockImplementation(() => {});

      const { ScanLifecycleManager } = await import('@/lib/scan-lifecycle-manager');
      const manager = new ScanLifecycleManager({ enableAnalytics: true });

      await manager.checkEnterpriseDetection('scan-123', 'site-456', {
        discoveredUrls: 175,
        elapsedMinutes: 4,
        frontierGrowing: true,
      });

      expect(mockEnterpriseDetectedAnalytics).toHaveBeenCalledWith({
        siteId: 'site-456',
        scanId: 'scan-123',
        discoveredUrls: 175,
        elapsedMinutes: 4,
        frontierGrowing: true,
        reason: 'url_threshold',
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockIsScanProfilesEnabled.mockReturnValue(true);
      mockIsEnterpriseGatingEnabled.mockReturnValue(true);
    });

    it('gracefully handles detection errors', async () => {
      mockDetectEnterprise.mockImplementation(() => {
        throw new Error('Detection failure');
      });

      const { ScanLifecycleManager } = await import('@/lib/scan-lifecycle-manager');
      const manager = new ScanLifecycleManager({ enableAnalytics: false });

      const result = await manager.checkEnterpriseDetection('scan-123', 'site-456', {
        discoveredUrls: 200,
        elapsedMinutes: 6,
        frontierGrowing: true,
      });

      // Should not stop scan on error
      expect(result.shouldStop).toBe(false);
    });
  });
});

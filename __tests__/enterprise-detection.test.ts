/**
 * Unit Tests: Enterprise Site Detection
 *
 * Tests for detectEnterprise function and detection heuristics.
 *
 * @see /docs/tech/scan-profiles-spec.md#enterprise-detection
 */

import { describe, it, expect } from '@jest/globals';
import {
  detectEnterprise,
  URL_THRESHOLD,
  TIME_THRESHOLD_MIN,
  type DetectionInput,
} from '@/lib/enterprise-detection';

describe('detectEnterprise', () => {
  describe('Rule A: URL Threshold Detection', () => {
    it('triggers on discoveredUrls=151 (just above threshold)', () => {
      const input: DetectionInput = {
        discoveredUrls: 151,
        elapsedMinutes: 2,
        frontierGrowing: false,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(true);
      expect(result.reason).toBe('url_threshold');
    });

    it('triggers on discoveredUrls=200 (well above threshold)', () => {
      const input: DetectionInput = {
        discoveredUrls: 200,
        elapsedMinutes: 1,
        frontierGrowing: false,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(true);
      expect(result.reason).toBe('url_threshold');
    });

    it('does NOT trigger at discoveredUrls=150 (exactly at threshold)', () => {
      const input: DetectionInput = {
        discoveredUrls: 150,
        elapsedMinutes: 10,
        frontierGrowing: true,
      };

      const result = detectEnterprise(input);

      // At threshold, not over - should NOT trigger URL rule
      // But might trigger time rule
      if (result.isEnterprise) {
        expect(result.reason).toBe('time_frontier');
      }
    });

    it('does NOT trigger at discoveredUrls=149 (below threshold)', () => {
      const input: DetectionInput = {
        discoveredUrls: 149,
        elapsedMinutes: 2,
        frontierGrowing: false,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(false);
      expect(result.reason).toBeNull();
    });
  });

  describe('Rule B: Time + Frontier Growth Detection', () => {
    it('triggers on elapsed=6 min & frontierGrowing=true', () => {
      const input: DetectionInput = {
        discoveredUrls: 100,
        elapsedMinutes: 6,
        frontierGrowing: true,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(true);
      expect(result.reason).toBe('time_frontier');
    });

    it('triggers on elapsed=10 min & frontierGrowing=true', () => {
      const input: DetectionInput = {
        discoveredUrls: 80,
        elapsedMinutes: 10,
        frontierGrowing: true,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(true);
      expect(result.reason).toBe('time_frontier');
    });

    it('does NOT trigger at elapsed=5 min exactly (at threshold)', () => {
      const input: DetectionInput = {
        discoveredUrls: 100,
        elapsedMinutes: 5,
        frontierGrowing: true,
      };

      const result = detectEnterprise(input);

      // At threshold, not over - should not trigger
      expect(result.isEnterprise).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('does NOT trigger on elapsed=6 min but frontierGrowing=false', () => {
      const input: DetectionInput = {
        discoveredUrls: 100,
        elapsedMinutes: 6,
        frontierGrowing: false,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('does NOT trigger on elapsed=10 min but frontierGrowing=false', () => {
      const input: DetectionInput = {
        discoveredUrls: 120,
        elapsedMinutes: 10,
        frontierGrowing: false,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('does NOT trigger on elapsed=4 min even with frontierGrowing=true', () => {
      const input: DetectionInput = {
        discoveredUrls: 100,
        elapsedMinutes: 4,
        frontierGrowing: true,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(false);
      expect(result.reason).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('prioritizes URL threshold over time+frontier when both trigger', () => {
      const input: DetectionInput = {
        discoveredUrls: 200, // Triggers Rule A
        elapsedMinutes: 10, // Also triggers Rule B
        frontierGrowing: true,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(true);
      // Should return URL threshold reason (checked first)
      expect(result.reason).toBe('url_threshold');
    });

    it('handles zero values correctly', () => {
      const input: DetectionInput = {
        discoveredUrls: 0,
        elapsedMinutes: 0,
        frontierGrowing: false,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('handles very large URL counts', () => {
      const input: DetectionInput = {
        discoveredUrls: 10000,
        elapsedMinutes: 1,
        frontierGrowing: false,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(true);
      expect(result.reason).toBe('url_threshold');
    });

    it('handles very long elapsed times', () => {
      const input: DetectionInput = {
        discoveredUrls: 50,
        elapsedMinutes: 60,
        frontierGrowing: true,
      };

      const result = detectEnterprise(input);

      expect(result.isEnterprise).toBe(true);
      expect(result.reason).toBe('time_frontier');
    });
  });

  describe('Threshold Constants', () => {
    it('exports URL_THRESHOLD constant', () => {
      expect(URL_THRESHOLD).toBe(150);
      expect(typeof URL_THRESHOLD).toBe('number');
    });

    it('exports TIME_THRESHOLD_MIN constant', () => {
      expect(TIME_THRESHOLD_MIN).toBe(5);
      expect(typeof TIME_THRESHOLD_MIN).toBe('number');
    });
  });

  describe('Boundary Testing', () => {
    it('does not trigger at URL threshold boundary (150)', () => {
      const result = detectEnterprise({
        discoveredUrls: URL_THRESHOLD,
        elapsedMinutes: 1,
        frontierGrowing: false,
      });

      expect(result.isEnterprise).toBe(false);
    });

    it('triggers at URL threshold boundary + 1 (151)', () => {
      const result = detectEnterprise({
        discoveredUrls: URL_THRESHOLD + 1,
        elapsedMinutes: 1,
        frontierGrowing: false,
      });

      expect(result.isEnterprise).toBe(true);
      expect(result.reason).toBe('url_threshold');
    });

    it('does not trigger at time threshold boundary (5 min)', () => {
      const result = detectEnterprise({
        discoveredUrls: 100,
        elapsedMinutes: TIME_THRESHOLD_MIN,
        frontierGrowing: true,
      });

      expect(result.isEnterprise).toBe(false);
    });

    it('triggers at time threshold boundary + 0.1 (5.1 min)', () => {
      const result = detectEnterprise({
        discoveredUrls: 100,
        elapsedMinutes: TIME_THRESHOLD_MIN + 0.1,
        frontierGrowing: true,
      });

      expect(result.isEnterprise).toBe(true);
      expect(result.reason).toBe('time_frontier');
    });
  });
});

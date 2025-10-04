/**
 * Safe analytics wrapper that never throws errors or affects control flow
 * All analytics failures are logged at debug level and gracefully handled
 */

export interface AnalyticsEvent {
  [key: string]: any
}

/**
 * Safely emit analytics events with error isolation
 * Never throws - all errors are caught and logged
 */
export function safeAnalytics(eventName: string, data: AnalyticsEvent): void {
  try {
    // Structured logging for analytics (can be picked up by log aggregators)
    const analyticsPayload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      ...data
    }
    
    console.log(`📊 [analytics] ${eventName}:`, JSON.stringify(analyticsPayload))
    
    // Future: Add actual analytics service calls here
    // - PostHog, Mixpanel, Google Analytics, etc.
    // - All wrapped in try/catch to prevent failures
    
  } catch (error) {
    // Log analytics failures at debug level - never affect user experience
    console.debug(`📊 [analytics-error] Failed to emit ${eventName}:`, error)
  }
}

/**
 * Batch analytics events for better performance
 * Useful for high-frequency events like polling
 */
export class SafeAnalyticsBatcher {
  private events: Array<{ name: string; data: AnalyticsEvent; timestamp: number }> = []
  private flushTimeout: NodeJS.Timeout | null = null
  private readonly batchSize: number
  private readonly flushIntervalMs: number

  constructor(batchSize = 10, flushIntervalMs = 5000) {
    this.batchSize = batchSize
    this.flushIntervalMs = flushIntervalMs
  }

  /**
   * Add event to batch - will auto-flush when batch is full or on timer
   */
  emit(eventName: string, data: AnalyticsEvent): void {
    try {
      this.events.push({
        name: eventName,
        data,
        timestamp: Date.now()
      })

      // Auto-flush if batch is full
      if (this.events.length >= this.batchSize) {
        this.flush()
      } else {
        // Schedule flush if not already scheduled
        if (!this.flushTimeout) {
          this.flushTimeout = setTimeout(() => this.flush(), this.flushIntervalMs)
        }
      }
    } catch (error) {
      console.debug(`📊 [analytics-batcher-error] Failed to batch ${eventName}:`, error)
    }
  }

  /**
   * Immediately flush all batched events
   */
  flush(): void {
    try {
      if (this.events.length === 0) return

      // Clear timeout
      if (this.flushTimeout) {
        clearTimeout(this.flushTimeout)
        this.flushTimeout = null
      }

      // Emit all batched events
      const eventsToFlush = [...this.events]
      this.events = []

      console.log(`📊 [analytics-batch] Flushing ${eventsToFlush.length} events`)
      
      eventsToFlush.forEach(({ name, data, timestamp }) => {
        safeAnalytics(name, {
          ...data,
          batchedAt: new Date(timestamp).toISOString(),
          flushedAt: new Date().toISOString()
        })
      })

    } catch (error) {
      console.debug('📊 [analytics-batch-error] Failed to flush events:', error)
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    try {
      this.flush()
      if (this.flushTimeout) {
        clearTimeout(this.flushTimeout)
        this.flushTimeout = null
      }
    } catch (error) {
      console.debug('📊 [analytics-batcher-error] Failed to destroy batcher:', error)
    }
  }
}

/**
 * Pre-configured analytics functions for common scan events
 */
export const scanAnalytics = {
  started: (scanId: string, siteId: string, userId: string, metadata: Record<string, any> = {}) => {
    safeAnalytics('scan_started', {
      scanId,
      siteId,
      userId,
      ...metadata
    })
  },

  completed: (scanId: string, siteId: string, userId: string, results: Record<string, any> = {}) => {
    safeAnalytics('scan_completed', {
      scanId,
      siteId,
      userId,
      ...results
    })
  },

  failed: (scanId: string, siteId: string, userId: string, error: string, metadata: Record<string, any> = {}) => {
    safeAnalytics('scan_failed', {
      scanId,
      siteId,
      userId,
      error,
      ...metadata
    })
  },

  progress: (scanId: string, userId: string, message: string, metadata: Record<string, any> = {}) => {
    safeAnalytics('scan_progress', {
      scanId,
      userId,
      message,
      ...metadata
    })
  },

  reportViewed: (scanId: string, status: string, siteId: string, userId: string, metadata: Record<string, any> = {}) => {
    safeAnalytics('report_viewed', {
      scanId,
      status,
      siteId,
      userId,
      ...metadata
    })
  },

  pollingStarted: (scanId: string, userId: string) => {
    safeAnalytics('scan_polling_started', {
      scanId,
      userId
    })
  },

  pollingStopped: (scanId: string, userId: string, reason: string, attempts: number, duration: number) => {
    safeAnalytics('scan_polling_stopped', {
      scanId,
      userId,
      reason,
      attempts,
      duration
    })
  },

  /**
   * Generic track method for custom events
   */
  track: (eventName: string, data: Record<string, any> = {}) => {
    safeAnalytics(eventName, data)
  },

  /**
   * Enterprise detection event (PR #2)
   */
  enterpriseDetected: (params: {
    siteId: string;
    scanId: string;
    discoveredUrls: number;
    elapsedMinutes: number;
    frontierGrowing: boolean;
    reason: 'url_threshold' | 'time_frontier';
  }) => {
    safeAnalytics('enterprise.detect.v1', params)
  }
}

/**
 * Global analytics batcher instance for high-frequency events
 */
export const globalAnalyticsBatcher = new SafeAnalyticsBatcher()

// Clean up on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => globalAnalyticsBatcher.destroy())
  process.on('SIGINT', () => globalAnalyticsBatcher.destroy())
  process.on('SIGTERM', () => globalAnalyticsBatcher.destroy())
}

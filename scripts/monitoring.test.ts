import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { runMonitoring } from './monitoring'
import { runA11yScan } from './runA11yScan'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/app/types/database'
import type { AxeResults } from 'axe-core'

interface ScanResult {
  score: number
  issues: Array<{
    rule: string
    impact: 'critical' | 'serious' | 'moderate' | 'minor'
    description: string
    helpUrl: string
    selector: string
    html: string
    summary: string
  }>
  summary: {
    totalIssues: number
    byImpact: {
      critical: number
      serious: number
      moderate: number
      minor: number
    }
    byRule: { [key: string]: number }
  }
  raw: AxeResults
}

// Mock the dependencies
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}))

jest.mock('./runA11yScan', () => ({
  runA11yScan: jest.fn()
}))

jest.mock('fs', () => ({
  appendFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}))

describe('Monitoring Script', () => {
  let mockSupabase: ReturnType<typeof createClient<Database>>
  let mockSelect: ReturnType<typeof jest.fn>
  let mockInsert: ReturnType<typeof jest.fn>
  let mockUpdate: ReturnType<typeof jest.fn>

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Mock Supabase client
    mockSelect = jest.fn().mockReturnValue({ data: [], error: null })
    mockInsert = jest.fn().mockReturnValue({ data: null, error: null })
    mockUpdate = jest.fn().mockReturnValue({ data: null, error: null })

    const mockChain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis()
    }

    mockSupabase = {
      from: jest.fn().mockReturnValue(mockChain)
    } as any

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

    // Mock runA11yScan with proper typing
    const mockScanResult: ScanResult = {
      score: 95,
      issues: [
        {
          rule: 'test-rule',
          impact: 'critical',
          description: 'Test issue',
          helpUrl: 'https://test.com/help',
          selector: 'button',
          html: '<button>Test</button>',
          summary: 'Test summary'
        }
      ],
      summary: {
        totalIssues: 1,
        byImpact: { critical: 1, serious: 0, moderate: 0, minor: 0 },
        byRule: { 'test-rule': 1 }
      },
      raw: {} as AxeResults
    }
    ;(runA11yScan as jest.Mock).mockImplementation(async () => mockScanResult)

    // Mock environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  })

  afterEach(() => {
    jest.resetModules()
  })

  it('should handle empty sites list', async () => {
    // Mock sites query to return empty list
    mockSelect.mockResolvedValueOnce({ data: [], error: null })

    const summary = await runMonitoring()

    expect(summary.totalSites).toBe(0)
    expect(summary.successfulScans).toBe(0)
    expect(summary.failedScans).toBe(0)
    expect(summary.siteResults).toHaveLength(0)
  })

  it('should handle successful scan', async () => {
    // Mock sites query
    mockSelect.mockResolvedValueOnce({
      data: [{
        id: 'site-1',
        name: 'Test Site',
        url: 'https://test.com',
        monitoring: true
      }],
      error: null
    })

    // Mock scan creation
    mockInsert.mockResolvedValueOnce({
      data: { id: 'scan-1', site_id: 'site-1', status: 'running' },
      error: null
    })

    // Mock scan result
    const mockSuccessResult: ScanResult = {
      score: 95,
      issues: [
        {
          rule: 'test-rule',
          impact: 'critical',
          description: 'Test issue',
          helpUrl: 'https://test.com/help',
          selector: 'button',
          html: '<button>Test</button>',
          summary: 'Test summary'
        }
      ],
      summary: {
        totalIssues: 1,
        byImpact: { critical: 1, serious: 0, moderate: 0, minor: 0 },
        byRule: { 'test-rule': 1 }
      },
      raw: {} as AxeResults
    }
    ;(runA11yScan as jest.Mock).mockResolvedValueOnce(mockSuccessResult)

    // Mock previous scans query for trends
    mockSelect.mockResolvedValueOnce({
      data: [],
      error: null
    })

    // Mock issue insertion
    mockInsert.mockResolvedValueOnce({ data: null, error: null })

    // Mock scan update
    mockUpdate.mockResolvedValueOnce({ data: null, error: null })

    // Mock trends insertion
    mockInsert.mockResolvedValueOnce({ data: null, error: null })

    // Mock summary insertion
    mockInsert.mockResolvedValueOnce({ data: null, error: null })

    const summary = await runMonitoring()

    expect(summary.totalSites).toBe(1)
    expect(summary.successfulScans).toBe(1)
    expect(summary.failedScans).toBe(0)
    expect(summary.totalIssuesFound).toBe(1)
    expect(summary.averageScore).toBe(95)
    expect(summary.totalNewIssues).toBe(1)
    expect(summary.criticalIssuesDelta).toBe(1)
    expect(summary.siteResults).toHaveLength(1)
    expect(summary.siteResults[0]).toMatchObject({
      name: 'Test Site',
      url: 'https://test.com',
      status: 'success',
      score: 95,
      issuesCount: 1
    })
  })

  it('should handle scan failure', async () => {
    // Mock sites query
    mockSelect.mockResolvedValueOnce({
      data: [{
        id: 'site-1',
        name: 'Test Site',
        url: 'https://test.com',
        monitoring: true
      }],
      error: null
    })

    // Mock scan creation
    mockInsert.mockResolvedValueOnce({
      data: { id: 'scan-1', site_id: 'site-1', status: 'running' },
      error: null
    })

    // Mock scan failure
    ;(runA11yScan as jest.Mock).mockRejectedValueOnce(new Error('Test error'))

    // Mock scan update to failed status
    mockUpdate.mockResolvedValueOnce({ data: null, error: null })

    // Mock summary insertion
    mockInsert.mockResolvedValueOnce({ data: null, error: null })

    const summary = await runMonitoring()

    expect(summary.totalSites).toBe(1)
    expect(summary.successfulScans).toBe(0)
    expect(summary.failedScans).toBe(1)
    expect(summary.siteResults).toHaveLength(1)
    expect(summary.siteResults[0]).toMatchObject({
      name: 'Test Site',
      url: 'https://test.com',
      status: 'failure',
      error: 'Test error'
    })
  })

  it('should handle retry on failure', async () => {
    // Mock sites query
    mockSelect.mockResolvedValueOnce({
      data: [{
        id: 'site-1',
        name: 'Test Site',
        url: 'https://test.com',
        monitoring: true
      }],
      error: null
    })

    // Mock scan creation
    mockInsert.mockResolvedValueOnce({
      data: { id: 'scan-1', site_id: 'site-1', status: 'running' },
      error: null
    })

    // Mock scan failure then success
    const mockRetryResult: ScanResult = {
      score: 95,
      issues: [],
      summary: {
        totalIssues: 0,
        byImpact: { critical: 0, serious: 0, moderate: 0, minor: 0 },
        byRule: {}
      },
      raw: {} as AxeResults
    }
    ;(runA11yScan as jest.Mock)
      .mockRejectedValueOnce(new Error('Test error'))
      .mockResolvedValueOnce(mockRetryResult)

    // Mock scan update to failed status
    mockUpdate.mockResolvedValue({ data: null, error: null })

    // Mock previous scans query for trends
    mockSelect.mockResolvedValueOnce({
      data: [],
      error: null
    })

    // Mock trends insertion
    mockInsert.mockResolvedValueOnce({ data: null, error: null })

    // Mock summary insertion
    mockInsert.mockResolvedValueOnce({ data: null, error: null })

    const summary = await runMonitoring()

    expect(summary.totalSites).toBe(1)
    expect(summary.successfulScans).toBe(1)
    expect(summary.failedScans).toBe(0)
    expect(summary.siteResults).toHaveLength(1)
    expect(summary.siteResults[0]).toMatchObject({
      name: 'Test Site',
      url: 'https://test.com',
      status: 'success',
      score: 95,
      issuesCount: 0,
      retries: 1
    })
  })

  it('should handle trend calculation', async () => {
    // Mock sites query
    mockSelect.mockResolvedValueOnce({
      data: [{
        id: 'site-1',
        name: 'Test Site',
        url: 'https://test.com',
        monitoring: true
      }],
      error: null
    })

    // Mock scan creation
    mockInsert.mockResolvedValueOnce({
      data: { id: 'scan-1', site_id: 'site-1', status: 'running' },
      error: null
    })

    // Mock scan result
    const mockTrendResult: ScanResult = {
      score: 95,
      issues: [
        {
          rule: 'test-rule',
          impact: 'critical',
          description: 'Test issue',
          helpUrl: 'https://test.com/help',
          selector: 'button',
          html: '<button>Test</button>',
          summary: 'Test summary'
        }
      ],
      summary: {
        totalIssues: 1,
        byImpact: { critical: 1, serious: 0, moderate: 0, minor: 0 },
        byRule: { 'test-rule': 1 }
      },
      raw: {} as AxeResults
    }
    ;(runA11yScan as jest.Mock).mockResolvedValueOnce(mockTrendResult)

    // Mock previous scans query for trends
    mockSelect.mockResolvedValueOnce({
      data: [{
        id: 'scan-0',
        score: 90,
        issues: [
          {
            id: 1,
            scan_id: 'scan-0',
            rule: 'old-rule',
            selector: 'div',
            severity: 'serious',
            impact: 'serious',
            description: 'Old issue',
            help_url: 'https://test.com/help',
            html: '<div>Old</div>'
          }
        ]
      }],
      error: null
    })

    // Mock issue insertion
    mockInsert.mockResolvedValueOnce({ data: null, error: null })

    // Mock scan update
    mockUpdate.mockResolvedValueOnce({ data: null, error: null })

    // Mock trends insertion
    mockInsert.mockResolvedValueOnce({ data: null, error: null })

    // Mock summary insertion
    mockInsert.mockResolvedValueOnce({ data: null, error: null })

    const summary = await runMonitoring()

    expect(summary.totalSites).toBe(1)
    expect(summary.successfulScans).toBe(1)
    expect(summary.totalNewIssues).toBe(1)
    expect(summary.totalResolvedIssues).toBe(1)
    expect(summary.criticalIssuesDelta).toBe(1)
    expect(summary.seriousIssuesDelta).toBe(-1)
  })
}) 
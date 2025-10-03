/**
 * Type definitions for Reports Dashboard
 */

export type TimeRange = '7d' | '30d' | '90d' | '180d' | 'month' | 'quarter' | 'custom'
export type Severity = 'critical' | 'serious' | 'moderate' | 'minor'
export type CoverageStatus = 'recent' | 'stale' | 'very_stale'

export interface ReportFilters {
  teamId: string
  siteId?: string
  timeRange: TimeRange
  startDate?: string
  endDate?: string
  severity?: Severity
  wcagLevel?: string
}

export interface KPIData {
  total_scans_30d: number
  total_sites: number
  monitored_sites: number
  total_violations_30d: number
  avg_score_30d: number
  github_issues_created_30d: number
}

export interface TrendDataPoint {
  date: string
  total_violations: number
  critical_count: number
  serious_count: number
  moderate_count: number
  minor_count: number
  scan_count: number
  avg_score?: number // Average score for forecasting
}

export interface TopRule {
  rule: string
  impact: Severity
  violation_count: number
  affected_sites: number
  github_issues_created: number
  description: string
  help_url: string
  site_ids: string[]
}

export interface TopPage {
  site_id: string
  site_name: string
  url: string
  last_scan_date: string
  total_violations: number
  critical_count: number
  serious_count: number
  moderate_count: number
  minor_count: number
  score: number
}

export interface FixThroughput {
  date: string
  violations_created: number
  violations_previous: number
  net_change: number
  violations_fixed: number
  site_name: string
}

export interface BacklogItem {
  site_name: string
  rule: string
  impact: Severity
  description: string
  days_old: number
  occurrence_count: number
  github_issue_url: string | null
}

export interface CoverageData {
  site_id: string
  site_name: string
  url: string
  monitoring_enabled: boolean
  total_scans: number
  last_scan_date: string | null
  first_scan_date: string | null
  avg_days_between_scans: number | null
  coverage_status: CoverageStatus
  days_since_last_scan: number | null
}

export interface TicketData {
  site_id: string
  site_name: string
  total_issues_created: number
  issues_created_7d: number
  issues_created_30d: number
  first_issue_date: string | null
  last_issue_date: string | null
  rules_with_issues: string[]
}

export interface RiskData {
  date: string
  severity: Severity
  current_risk: number
  previous_risk: number
  risk_reduced: number
}

export interface FalsePositiveData {
  site_name: string
  rule: string
  false_positive_count: number
  total_occurrences: number
  false_positive_rate: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  timestamp: string
}

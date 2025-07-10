export interface Site {
  id: string
  url: string
  name: string | null
  description?: string | null
  score?: number | null
  status?: 'idle' | 'scanning' | 'completed' | 'error' | 'queued' | null
  last_scan?: string | null
  created_at: string
  updated_at: string
  monitoring_enabled: boolean
  user_id: string | null
  latest_audit_result_id?: string | null
  custom_domain: string | null
}

export interface AuditResult {
  id: string
  site_id: string
  url: string
  score: number
  violations: number
  by_severity: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
  raw_violations: ViolationDetail[]
  created_at: string
  user_id?: string
}

export interface ViolationDetail {
  id: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help: string
  helpUrl: string
  nodes: ViolationNode[]
  tags: string[]
}

export interface ViolationNode {
  any: any[]
  all: any[]
  none: any[]
  impact: string
  html: string
  target: string[]
  xpath: string[]
  ancestry: string[]
  text: string
  screenshot?: string
}

export interface DashboardStats {
  totalSites: number
  averageScore: number
  totalAudits: number
  bestScore: number
  worstScore: number
  auditsThisMonth: number
  trendsData: TrendData[]
}

export interface TrendData {
  date: string
  score: number
  issues: number
}

export interface ActivityItem {
  id: string
  type: 'scan_completed' | 'issues_found' | 'site_added' | 'monitoring_enabled'
  title: string
  description: string
  timestamp: string
  score?: number
  severity?: 'critical' | 'serious' | 'moderate' | 'minor'
  url?: string
}

export interface IssuesSummary {
  id: string
  name: string
  description: string
  count: number
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
  affectedSites: number
  totalSites: number
  category: string
  fixable: boolean
}

export interface Recommendation {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  category: 'automation' | 'monitoring' | 'compliance' | 'performance'
  action: string
  actionHref?: string
  estimatedImpact: 'high' | 'medium' | 'low'
  effort: 'quick' | 'moderate' | 'extensive'
  completed: boolean
}

export interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  action: string
  href?: string
}

export interface ScanModalProps {
  isOpen: boolean
  onClose: () => void
  onOptimisticCreate: (url: string) => string
  onCreationFailed: (tempId: string) => void
  onSuccess: () => void
}

export interface AuditApiResponse {
  success: boolean
  data?: {
    site: Site
    auditResult: AuditResult
  }
  error?: string
  summary?: {
    score: number
    violations: number
    by_severity: {
      critical: number
      serious: number
      moderate: number
      minor: number
    }
  }
}

export interface MonitoringConfig {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  notifications: {
    email: boolean
    webhook?: string
  }
  thresholds: {
    score: number
    violations: number
  }
}

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
} 
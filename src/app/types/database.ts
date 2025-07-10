export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          github_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          github_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          github_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      sites: {
        Row: {
          id: string
          user_id: string | null
          url: string
          name: string | null
          custom_domain: string | null
          monitoring_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string | null
          url: string
          name?: string | null
          custom_domain?: string | null
          monitoring_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          url?: string
          name?: string | null
          custom_domain?: string | null
          monitoring_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          site_id: string
          score: number | null
          started_at: string
          finished_at: string | null
          status: 'pending' | 'running' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          site_id: string
          score?: number | null
          started_at?: string
          finished_at?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          score?: number | null
          started_at?: string
          finished_at?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          created_at?: string
        }
      }
      issues: {
        Row: {
          id: number
          scan_id: string
          rule: string
          selector: string
          severity: 'critical' | 'serious' | 'moderate' | 'minor'
          impact: 'critical' | 'serious' | 'moderate' | 'minor' | null
          description: string | null
          help_url: string | null
          html: string | null
          created_at: string
        }
        Insert: {
          id?: number
          scan_id: string
          rule: string
          selector: string
          severity: 'critical' | 'serious' | 'moderate' | 'minor'
          impact?: 'critical' | 'serious' | 'moderate' | 'minor' | null
          description?: string | null
          help_url?: string | null
          html?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          scan_id?: string
          rule?: string
          selector?: string
          severity?: 'critical' | 'serious' | 'moderate' | 'minor'
          impact?: 'critical' | 'serious' | 'moderate' | 'minor' | null
          description?: string | null
          help_url?: string | null
          html?: string | null
          created_at?: string
        }
      }
      scan_trends: {
        Row: {
          id: string
          scan_id: string
          site_id: string
          previous_scan_id: string | null
          score_change: number | null
          new_issues_count: number
          resolved_issues_count: number
          critical_issues_delta: number
          serious_issues_delta: number
          moderate_issues_delta: number
          minor_issues_delta: number
          created_at: string
        }
        Insert: {
          id?: string
          scan_id: string
          site_id: string
          previous_scan_id?: string | null
          score_change?: number | null
          new_issues_count?: number
          resolved_issues_count?: number
          critical_issues_delta?: number
          serious_issues_delta?: number
          moderate_issues_delta?: number
          minor_issues_delta?: number
          created_at?: string
        }
        Update: {
          id?: string
          scan_id?: string
          site_id?: string
          previous_scan_id?: string | null
          score_change?: number | null
          new_issues_count?: number
          resolved_issues_count?: number
          critical_issues_delta?: number
          serious_issues_delta?: number
          moderate_issues_delta?: number
          minor_issues_delta?: number
          created_at?: string
        }
      }
    }
    Views: {
      scan_summaries: {
        Row: {
          scan_id: string
          score: number | null
          started_at: string
          finished_at: string | null
          status: string
          site_id: string
          url: string
          site_name: string | null
          user_id: string
          total_issues: number
          critical_issues: number
          serious_issues: number
          moderate_issues: number
          minor_issues: number
        }
      }
      site_trend_stats: {
        Row: {
          site_id: string
          url: string
          site_name: string | null
          user_id: string
          total_scans: number
          avg_score_change: number | null
          total_new_issues: number
          total_resolved_issues: number
          critical_issues_trend: number
          serious_issues_trend: number
          moderate_issues_trend: number
          minor_issues_trend: number
          last_scan_at: string
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
export type User = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type Site = Database['public']['Tables']['sites']['Row']
export type SiteInsert = Database['public']['Tables']['sites']['Insert']
export type SiteUpdate = Database['public']['Tables']['sites']['Update']

export type Scan = Database['public']['Tables']['scans']['Row']
export type ScanInsert = Database['public']['Tables']['scans']['Insert']
export type ScanUpdate = Database['public']['Tables']['scans']['Update']

export type Issue = Database['public']['Tables']['issues']['Row']
export type IssueInsert = Database['public']['Tables']['issues']['Insert']
export type IssueUpdate = Database['public']['Tables']['issues']['Update']

export type ScanSummary = Database['public']['Views']['scan_summaries']['Row']

export type SeverityLevel = 'critical' | 'serious' | 'moderate' | 'minor'
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed'

export type ScanTrend = Database['public']['Tables']['scan_trends']['Row']
export type ScanTrendInsert = Database['public']['Tables']['scan_trends']['Insert']
export type ScanTrendUpdate = Database['public']['Tables']['scan_trends']['Update']
export type SiteTrendStats = Database['public']['Views']['site_trend_stats']['Row'] 
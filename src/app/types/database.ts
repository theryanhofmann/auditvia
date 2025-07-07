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
      sites: {
        Row: {
          id: string
          user_id: string | null
          url: string
          name: string | null
          monitoring: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          url: string
          name?: string | null
          monitoring?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          url?: string
          name?: string | null
          monitoring?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "scans_site_id_fkey"
            columns: ["site_id"]
            referencedRelation: "sites"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "issues_scan_id_fkey"
            columns: ["scan_id"]
            referencedRelation: "scans"
            referencedColumns: ["id"]
          }
        ]
      }
      scan_logs: {
        Row: {
          id: number
          site_id: string
          run_at: string
          success: boolean
          message: string | null
          created_at: string
        }
        Insert: {
          id?: number
          site_id: string
          run_at?: string
          success: boolean
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          site_id?: string
          run_at?: string
          success?: boolean
          message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_site_id_fkey"
            columns: ["site_id"]
            referencedRelation: "sites"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      scan_summaries: {
        Row: {
          scan_id: string
          score: number | null
          started_at: string
          finished_at: string | null
          status: 'pending' | 'running' | 'completed' | 'failed'
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
        Insert: {
          scan_id?: string
          score?: number | null
          started_at?: string
          finished_at?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          site_id?: string
          url?: string
          site_name?: string | null
          user_id?: string
          total_issues?: number
          critical_issues?: number
          serious_issues?: number
          moderate_issues?: number
          minor_issues?: number
        }
        Update: {
          scan_id?: string
          score?: number | null
          started_at?: string
          finished_at?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed'
          site_id?: string
          url?: string
          site_name?: string | null
          user_id?: string
          total_issues?: number
          critical_issues?: number
          serious_issues?: number
          moderate_issues?: number
          minor_issues?: number
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for easier usage
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

export type ScanLog = Database['public']['Tables']['scan_logs']['Row']
export type ScanLogInsert = Database['public']['Tables']['scan_logs']['Insert']
export type ScanLogUpdate = Database['public']['Tables']['scan_logs']['Update']

export type SeverityLevel = 'critical' | 'serious' | 'moderate' | 'minor'
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed' 
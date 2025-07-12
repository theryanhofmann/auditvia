export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          variables?: Json
          query?: string
          extensions?: Json
          operationName?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      issues: {
        Row: {
          created_at: string | null
          description: string | null
          help_url: string | null
          html: string | null
          id: number
          impact: string | null
          rule: string
          scan_id: string
          selector: string
          severity: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          help_url?: string | null
          html?: string | null
          id?: number
          impact?: string | null
          rule: string
          scan_id: string
          selector: string
          severity: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          help_url?: string | null
          html?: string | null
          id?: number
          impact?: string | null
          rule?: string
          scan_id?: string
          selector?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scan_summaries"
            referencedColumns: ["scan_id"]
          },
          {
            foreignKeyName: "issues_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_logs: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          message: string
          scan_id: string | null
          score: number | null
          site_id: string
          success: boolean
          violations: number | null
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          message: string
          scan_id?: string | null
          score?: number | null
          site_id: string
          success: boolean
          violations?: number | null
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          message?: string
          scan_id?: string | null
          score?: number | null
          site_id?: string
          success?: boolean
          violations?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_logs_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scan_summaries"
            referencedColumns: ["scan_id"]
          },
          {
            foreignKeyName: "monitoring_logs_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "monitoring_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_summary_logs: {
        Row: {
          average_score: number | null
          created_at: string | null
          execution_time_seconds: number | null
          failed_scans: number
          id: string
          sites_monitored: number
          successful_scans: number
          total_violations: number | null
        }
        Insert: {
          average_score?: number | null
          created_at?: string | null
          execution_time_seconds?: number | null
          failed_scans?: number
          id?: string
          sites_monitored?: number
          successful_scans?: number
          total_violations?: number | null
        }
        Update: {
          average_score?: number | null
          created_at?: string | null
          execution_time_seconds?: number | null
          failed_scans?: number
          id?: string
          sites_monitored?: number
          successful_scans?: number
          total_violations?: number | null
        }
        Relationships: []
      }
      scan_trends: {
        Row: {
          created_at: string | null
          critical_issues_delta: number
          id: string
          minor_issues_delta: number
          moderate_issues_delta: number
          new_issues_count: number
          previous_scan_id: string | null
          resolved_issues_count: number
          scan_id: string
          serious_issues_delta: number
          site_id: string
        }
        Insert: {
          created_at?: string | null
          critical_issues_delta?: number
          id?: string
          minor_issues_delta?: number
          moderate_issues_delta?: number
          new_issues_count?: number
          previous_scan_id?: string | null
          resolved_issues_count?: number
          scan_id: string
          serious_issues_delta?: number
          site_id: string
        }
        Update: {
          created_at?: string | null
          critical_issues_delta?: number
          id?: string
          minor_issues_delta?: number
          moderate_issues_delta?: number
          new_issues_count?: number
          previous_scan_id?: string | null
          resolved_issues_count?: number
          scan_id?: string
          serious_issues_delta?: number
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_trends_previous_scan_id_fkey"
            columns: ["previous_scan_id"]
            isOneToOne: false
            referencedRelation: "scan_summaries"
            referencedColumns: ["scan_id"]
          },
          {
            foreignKeyName: "scan_trends_previous_scan_id_fkey"
            columns: ["previous_scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_trends_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scan_summaries"
            referencedColumns: ["scan_id"]
          },
          {
            foreignKeyName: "scan_trends_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_trends_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "scan_trends_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          created_at: string | null
          finished_at: string | null
          id: string
          inapplicable: number | null
          incomplete: number | null
          passes: number | null
          scan_time_ms: number | null
          site_id: string
          started_at: string | null
          status: string | null
          total_violations: number | null
        }
        Insert: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          inapplicable?: number | null
          incomplete?: number | null
          passes?: number | null
          scan_time_ms?: number | null
          site_id: string
          started_at?: string | null
          status?: string | null
          total_violations?: number | null
        }
        Update: {
          created_at?: string | null
          finished_at?: string | null
          id?: string
          inapplicable?: number | null
          incomplete?: number | null
          passes?: number | null
          scan_time_ms?: number | null
          site_id?: string
          started_at?: string | null
          status?: string | null
          total_violations?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "scans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_scan_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          scan_id: string | null
          scanned_url: string
          site_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          scan_id?: string | null
          scanned_url: string
          site_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          scan_id?: string | null
          scanned_url?: string
          site_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_scan_logs_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scan_summaries"
            referencedColumns: ["scan_id"]
          },
          {
            foreignKeyName: "scheduled_scan_logs_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_scan_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "scheduled_scan_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string | null
          custom_domain: string | null
          github_id: string | null
          id: string
          monitoring: boolean | null
          monitoring_enabled: boolean | null
          name: string | null
          updated_at: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          custom_domain?: string | null
          github_id?: string | null
          id?: string
          monitoring?: boolean | null
          monitoring_enabled?: boolean | null
          name?: string | null
          updated_at?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          custom_domain?: string | null
          github_id?: string | null
          id?: string
          monitoring?: boolean | null
          monitoring_enabled?: boolean | null
          name?: string | null
          updated_at?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          github_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          github_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          github_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      monitoring_stats: {
        Row: {
          average_score: number | null
          failed_runs: number | null
          last_monitored_at: string | null
          monitoring: boolean | null
          site_id: string | null
          site_name: string | null
          successful_runs: number | null
          total_monitoring_runs: number | null
          total_violations: number | null
          url: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_summaries: {
        Row: {
          created_at: string | null
          inapplicable: number | null
          incomplete: number | null
          passes: number | null
          scan_id: string | null
          scan_time_ms: number | null
          site_id: string | null
          total_violations: number | null
        }
        Insert: {
          created_at?: string | null
          inapplicable?: number | null
          incomplete?: number | null
          passes?: number | null
          scan_id?: string | null
          scan_time_ms?: number | null
          site_id?: string | null
          total_violations?: number | null
        }
        Update: {
          created_at?: string | null
          inapplicable?: number | null
          incomplete?: number | null
          passes?: number | null
          scan_id?: string | null
          scan_time_ms?: number | null
          site_id?: string | null
          total_violations?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "scans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_trend_stats: {
        Row: {
          created_at: string | null
          site_id: string | null
          total_violations_delta: number | null
          violations_added: number | null
          violations_resolved: number | null
        }
        Insert: {
          created_at?: string | null
          site_id?: string | null
          total_violations_delta?: never
          violations_added?: number | null
          violations_resolved?: number | null
        }
        Update: {
          created_at?: string | null
          site_id?: string | null
          total_violations_delta?: never
          violations_added?: number | null
          violations_resolved?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_trends_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "monitoring_stats"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "scan_trends_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      trigger_scheduled_monitoring: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_scan_record: {
        Args: {
          p_status: string
          p_scan_id: string
          p_incomplete: number
          p_inapplicable: number
          p_scan_time_ms: number
          p_passes: number
          p_finished_at: string
          p_total_violations: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


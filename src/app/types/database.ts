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
          pro: boolean
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          github_id: string
          pro?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          github_id?: string
          pro?: boolean
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sites: {
        Row: {
          id: string
          user_id: string
          url: string
          name: string | null
          monitoring_enabled: boolean
          custom_domain: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          name?: string | null
          monitoring_enabled?: boolean
          custom_domain?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          name?: string | null
          monitoring_enabled?: boolean
          custom_domain?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      scans: {
        Row: {
          id: string
          site_id: string
          user_id: string
          status: string
          started_at: string
          finished_at: string | null
          total_violations: number | null
          passes: number | null
          incomplete: number | null
          inapplicable: number | null
          scan_time_ms: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_id: string
          user_id: string
          status?: string
          started_at?: string
          finished_at?: string | null
          total_violations?: number | null
          passes?: number | null
          incomplete?: number | null
          inapplicable?: number | null
          scan_time_ms?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_id?: string
          user_id?: string
          status?: string
          started_at?: string
          finished_at?: string | null
          total_violations?: number | null
          passes?: number | null
          incomplete?: number | null
          inapplicable?: number | null
          scan_time_ms?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      issues: {
        Row: {
          id: number
          scan_id: string
          rule: string
          selector: string
          severity: string
          impact: string | null
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
          severity: string
          impact?: string | null
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
          severity?: string
          impact?: string | null
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
          new_issues_count?: number
          resolved_issues_count?: number
          critical_issues_delta?: number
          serious_issues_delta?: number
          moderate_issues_delta?: number
          minor_issues_delta?: number
          created_at?: string
        }
      }
      team_invites: {
        Row: {
          id: string
          team_id: string
          email: string
          role: 'admin' | 'member'
          status: 'pending' | 'accepted' | 'revoked'
          token: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          team_id: string
          email: string
          role: 'admin' | 'member'
          status?: 'pending' | 'accepted' | 'revoked'
          token: string
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          email?: string
          role?: 'admin' | 'member'
          status?: 'pending' | 'accepted' | 'revoked'
          token?: string
          created_at?: string
          expires_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
          billing_status: 'free' | 'trial' | 'pro'
          stripe_customer_id: string | null
          trial_ends_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
          billing_status?: 'free' | 'trial' | 'pro'
          stripe_customer_id?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
          billing_status?: 'free' | 'trial' | 'pro'
          stripe_customer_id?: string | null
          trial_ends_at?: string | null
        }
      }
    }
    Views: {
      scan_summaries: {
        Row: {
          site_id: string
          scan_id: string
          created_at: string
          total_violations: number | null
          passes: number | null
          incomplete: number | null
          inapplicable: number | null
          scan_time_ms: number | null
        }
      }
      site_trend_stats: {
        Row: {
          site_id: string
          created_at: string
          violations_added: number
          violations_resolved: number
          total_violations_delta: number
        }
      }
    }
    Functions: {
      update_scan_record: {
        Args: {
          p_scan_id: string
          p_total_violations: number
          p_passes: number
          p_incomplete: number
          p_inapplicable: number
          p_scan_time_ms: number
          p_status: string
          p_finished_at: string
        }
        Returns: undefined
      }
      is_team_on_trial: {
        Args: { team_id: string }
        Returns: boolean
      }
      has_team_pro_access: {
        Args: { team_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export interface User {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null
  subscription_period_end: string | null
  referral_code: string
  referred_by: string | null
  referral_credits: number
  created_at: string
  updated_at: string
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

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


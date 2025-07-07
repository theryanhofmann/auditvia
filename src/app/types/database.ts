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
          url: string
          name: string | null
          description: string | null
          score: number | null
          status: 'idle' | 'scanning' | 'completed' | 'error' | 'queued' | null
          last_scan: string | null
          created_at: string
          updated_at: string
          monitoring: boolean
          user_id: string | null
          latest_audit_result_id: string | null
        }
        Insert: {
          id?: string
          url: string
          name?: string | null
          description?: string | null
          score?: number | null
          status?: 'idle' | 'scanning' | 'completed' | 'error' | 'queued' | null
          last_scan?: string | null
          created_at?: string
          updated_at?: string
          monitoring?: boolean
          user_id?: string | null
          latest_audit_result_id?: string | null
        }
        Update: {
          id?: string
          url?: string
          name?: string | null
          description?: string | null
          score?: number | null
          status?: 'idle' | 'scanning' | 'completed' | 'error' | 'queued' | null
          last_scan?: string | null
          created_at?: string
          updated_at?: string
          monitoring?: boolean
          user_id?: string | null
          latest_audit_result_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_results: {
        Row: {
          id: string
          site_id: string
          url: string
          score: number
          violations: number
          by_severity: Json
          raw_violations: Json
          created_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          site_id: string
          url: string
          score: number
          violations: number
          by_severity: Json
          raw_violations: Json
          created_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          site_id?: string
          url?: string
          score?: number
          violations?: number
          by_severity?: Json
          raw_violations?: Json
          created_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_results_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      site_status: 'idle' | 'scanning' | 'completed' | 'error' | 'queued'
      violation_severity: 'critical' | 'serious' | 'moderate' | 'minor'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 
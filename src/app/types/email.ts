import { Database } from './database'

export type Site = Database['public']['Tables']['sites']['Row']
export type Scan = Database['public']['Tables']['scans']['Row'] & {
  score: number // Add score since it's calculated
}
export type Issue = Database['public']['Tables']['issues']['Row'] & {
  message: string // Add message since it's derived from description
}

export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor'

export interface EmailUser {
  id: string
  email: string | null
  name: string | null
  pro: boolean
} 
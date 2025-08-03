export type ScanData = {
  id: string
  score: number | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at: string
  finished_at: string | null
  created_at: string
  site_id: string
  total_violations: number
  passes: number
  incomplete: number
  inapplicable: number
  sites: {
    id: string
    name: string | null
    url: string
    user_id: string | null
  }
} 
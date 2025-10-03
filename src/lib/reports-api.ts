/**
 * Shared utilities for Reports API endpoints
 * Handles auth, team verification, and common query patterns
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'

export interface ReportFilters {
  teamId: string
  siteId?: string
  startDate?: string
  endDate?: string
  severity?: 'critical' | 'serious' | 'moderate' | 'minor'
}

export interface ApiError {
  error: string
  code: string
  details?: any
}

/**
 * Create authenticated Supabase client with service role
 */
export function createReportsClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Verify user has access to the requested team
 */
export async function verifyTeamAccess(
  supabase: ReturnType<typeof createReportsClient>,
  userId: string,
  teamId: string
): Promise<{ allowed: boolean; error?: ApiError }> {
  const { data: membership, error } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()

  if (error || !membership) {
    return {
      allowed: false,
      error: {
        error: 'Access denied',
        code: 'TEAM_ACCESS_DENIED',
        details: 'You do not have access to this team'
      }
    }
  }

  return { allowed: true }
}

/**
 * Validate and parse report filters from query params
 */
export function parseReportFilters(searchParams: URLSearchParams): {
  filters: ReportFilters | null
  error?: ApiError
} {
  const teamId = searchParams.get('teamId')
  
  if (!teamId) {
    return {
      filters: null,
      error: {
        error: 'Missing required parameter',
        code: 'MISSING_TEAM_ID',
        details: 'teamId is required'
      }
    }
  }

  const filters: ReportFilters = {
    teamId,
    siteId: searchParams.get('siteId') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    severity: (searchParams.get('severity') as any) || undefined
  }

  // Validate severity if provided
  if (filters.severity && !['critical', 'serious', 'moderate', 'minor'].includes(filters.severity)) {
    return {
      filters: null,
      error: {
        error: 'Invalid severity',
        code: 'INVALID_SEVERITY',
        details: 'severity must be one of: critical, serious, moderate, minor'
      }
    }
  }

  // Validate dates if provided
  if (filters.startDate && isNaN(Date.parse(filters.startDate))) {
    return {
      filters: null,
      error: {
        error: 'Invalid start date',
        code: 'INVALID_START_DATE',
        details: 'startDate must be a valid ISO 8601 date'
      }
    }
  }

  if (filters.endDate && isNaN(Date.parse(filters.endDate))) {
    return {
      filters: null,
      error: {
        error: 'Invalid end date',
        code: 'INVALID_END_DATE',
        details: 'endDate must be a valid ISO 8601 date'
      }
    }
  }

  return { filters }
}

/**
 * Apply standard filters to a view query
 */
export function applyFilters(
  query: any,
  filters: ReportFilters
) {
  let filteredQuery = query.eq('team_id', filters.teamId)

  if (filters.siteId) {
    filteredQuery = filteredQuery.eq('site_id', filters.siteId)
  }

  if (filters.startDate) {
    filteredQuery = filteredQuery.gte('date', filters.startDate)
  }

  if (filters.endDate) {
    filteredQuery = filteredQuery.lte('date', filters.endDate)
  }

  if (filters.severity) {
    filteredQuery = filteredQuery.eq('impact', filters.severity)
  }

  return filteredQuery
}

/**
 * Standard error responses
 */
export const ErrorResponses = {
  unauthorized: {
    error: 'Unauthorized',
    code: 'UNAUTHORIZED',
    details: 'Authentication required'
  },
  forbidden: {
    error: 'Forbidden',
    code: 'FORBIDDEN',
    details: 'Insufficient permissions'
  },
  internalError: {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: 'An unexpected error occurred'
  }
}

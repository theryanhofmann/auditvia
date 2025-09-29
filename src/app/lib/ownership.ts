import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'

/**
 * Centralized ownership verification for sites and scans
 * 
 * Implements the agreed-upon two-step verification:
 * 1. From scan/site → get site_id → get team_id
 * 2. Verify user_id belongs to team members
 */

export interface OwnershipResult {
  allowed: boolean
  role?: string
  site?: {
    id: string
    name: string | null
    url: string
    team_id: string
  }
  error?: {
    code: 'site_not_found' | 'scan_not_found' | 'team_not_found' | 'membership_not_found' | 'database_error'
    message: string
    httpStatus: 403 | 404 | 500
  }
}

interface OwnershipContext {
  userId: string
  siteId?: string
  scanId?: string
  logPrefix?: string
}

/**
 * Verify user ownership/access to a site or scan
 * 
 * @param context - Object containing userId and either siteId or scanId
 * @returns OwnershipResult with allowed status, role, and site info
 */
export async function verifyOwnership(context: OwnershipContext): Promise<OwnershipResult> {
  const { userId, siteId, scanId, logPrefix = '🔐 [ownership]' } = context
  
  console.log(`${logPrefix} Starting ownership verification for user: ${userId}`)
  
  if (!siteId && !scanId) {
    const error = {
      code: 'database_error' as const,
      message: 'Either siteId or scanId must be provided',
      httpStatus: 500 as const
    }
    console.error(`${logPrefix} ❌ Invalid input: ${error.message}`)
    return { allowed: false, error }
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    let resolvedSiteId = siteId
    
    // Step 1: If we have scanId, resolve to siteId first
    if (scanId && !siteId) {
      console.log(`${logPrefix} Resolving scanId ${scanId} to siteId`)
      
      const { data: scan, error: scanError } = await supabase
        .from('scans')
        .select('id, site_id')
        .eq('id', scanId)
        .single()

      if (scanError || !scan) {
        const error = {
          code: 'scan_not_found' as const,
          message: 'Scan not found',
          httpStatus: 404 as const
        }
        console.error(`${logPrefix} ❌ Scan not found: ${scanError?.message}`)
        return { allowed: false, error }
      }

      resolvedSiteId = scan.site_id
      console.log(`${logPrefix} ✅ Resolved scan ${scanId} to site ${resolvedSiteId}`)
    }

    // Step 2: Get site details and team_id
    console.log(`${logPrefix} Fetching site details for siteId: ${resolvedSiteId}`)
    
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, url, team_id')
      .eq('id', resolvedSiteId!)
      .single()

    if (siteError || !site) {
      const error = {
        code: 'site_not_found' as const,
        message: 'Site not found',
        httpStatus: 404 as const
      }
      console.error(`${logPrefix} ❌ Site not found: ${siteError?.message}`)
      return { allowed: false, error }
    }

    console.log(`${logPrefix} ✅ Site found: ${site.name || site.url} (team: ${site.team_id})`)

    // Step 3: Verify user is a member of the site's team
    console.log(`${logPrefix} Checking team membership for user: ${userId}, team: ${site.team_id}`)
    
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', site.team_id)
      .eq('user_id', userId)
      .single()

    if (membershipError || !membership) {
      const error = {
        code: 'membership_not_found' as const,
        message: 'You do not have access to this site',
        httpStatus: 403 as const
      }
      console.error(`${logPrefix} ❌ Membership not found: ${membershipError?.message}`)
      return { allowed: false, error }
    }

    console.log(`${logPrefix} ✅ Ownership verified - user has role: ${membership.role}`)

    return {
      allowed: true,
      role: membership.role,
      site
    }

  } catch (error) {
    const ownershipError = {
      code: 'database_error' as const,
      message: error instanceof Error ? error.message : 'Database error during ownership verification',
      httpStatus: 500 as const
    }
    console.error(`${logPrefix} ❌ Database error:`, error)
    return { allowed: false, error: ownershipError }
  }
}

/**
 * Convenience function for site-based ownership verification
 */
export async function verifySiteOwnership(userId: string, siteId: string, logPrefix?: string): Promise<OwnershipResult> {
  return verifyOwnership({ userId, siteId, logPrefix })
}

/**
 * Convenience function for scan-based ownership verification
 */
export async function verifyScanOwnership(userId: string, scanId: string, logPrefix?: string): Promise<OwnershipResult> {
  return verifyOwnership({ userId, scanId, logPrefix })
}


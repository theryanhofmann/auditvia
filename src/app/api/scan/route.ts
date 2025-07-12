import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { createServerClient } from '@supabase/ssr'
import { runA11yScan } from '../../../../scripts/runA11yScan'
import type { Database } from '@/app/types/database'

type ScanInsert = Database['public']['Tables']['scans']['Insert']
type IssueInsert = Database['public']['Tables']['issues']['Insert']
type SeverityLevel = 'critical' | 'serious' | 'moderate' | 'minor'

import { cookies } from 'next/headers'

type TypedSupabaseClient = ReturnType<typeof createServerClient<Database>>

interface ScanRequestBody {
  siteId: string
  url?: string // Optional override for testing
}

async function getOrCreateUser(supabase: TypedSupabaseClient, githubId: string): Promise<{ id: string }> {
  console.log('🔍 Looking up user with GitHub ID:', githubId)
  
  // Try to find existing user
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('id')
    .eq('github_id', githubId)
    .maybeSingle()

  if (fetchError) {
    console.error('❌ Failed to fetch user:', fetchError)
    throw new Error(`Failed to fetch user: ${fetchError.message}`)
  }

  if (existingUser) {
    console.log('✅ Found existing user:', existingUser.id)
    return existingUser
  }

  console.log('👤 Creating new user for GitHub ID:', githubId)
  
  // Create new user if not found
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({ github_id: githubId })
    .select('id')
    .single()

  if (createError || !newUser) {
    console.error('❌ Failed to create user:', createError)
    throw new Error(`Failed to create user: ${createError?.message || 'Unknown error'}`)
  }

  console.log('✅ Created new user:', newUser.id)
  return newUser
}

async function verifySiteOwnership(
  supabase: TypedSupabaseClient,
  siteId: string,
  userId: string
): Promise<{ id: string; url: string }> {
  console.log('🔐 Verifying site ownership:', { siteId, userId })
  
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, url')
    .eq('id', siteId)
    .eq('user_id', userId)
    .single()

  if (siteError || !site) {
    console.error('❌ Site verification failed:', siteError || 'Site not found')
    throw new Error('Site not found or access denied')
  }

  console.log('✅ Site ownership verified:', { id: site.id, url: site.url })
  return site
}

async function createScan(
  supabase: TypedSupabaseClient,
  siteId: string,
  status: ScanInsert['status'] = 'running'
): Promise<{ id: string }> {
  console.log('📝 Creating scan record:', { siteId, status })
  
  const scanData: ScanInsert = {
    site_id: siteId,
    status,
    started_at: new Date().toISOString(),
    finished_at: null
  }

  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .insert(scanData)
    .select('id')
    .single()

  if (scanError || !scan) {
    console.error('❌ Failed to create scan:', scanError)
    throw new Error(`Failed to create scan: ${scanError?.message || 'Unknown error'}`)
  }

  console.log('✅ Scan record created:', scan.id)
  return scan
}

async function createIssues(
  supabase: TypedSupabaseClient,
  scanId: string,
  scanResult: Awaited<ReturnType<typeof runA11yScan>>
): Promise<void> {
  if (scanResult.issues.length === 0) {
    console.log('ℹ️ No issues to create')
    return
  }

  console.log('📊 Processing', scanResult.issues.length, 'issues')
  
  const issuesData: IssueInsert[] = scanResult.issues.map(issue => ({
    scan_id: scanId,
    rule: issue.rule,
    selector: issue.selector,
    severity: issue.impact as SeverityLevel,
    impact: issue.impact,
    description: issue.description,
    help_url: issue.helpUrl,
    html: issue.html
  }))

  // Log issue breakdown by impact
  const byImpact = scanResult.issues.reduce((acc, issue) => {
    const impact = issue.impact || 'minor'
    acc[impact] = (acc[impact] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  console.log('📊 Issues by impact:')
  console.table(byImpact)

  const { error: issuesError } = await supabase
    .from('issues')
    .insert(issuesData)

  if (issuesError) {
    console.error('❌ Failed to create issues:', issuesError)
    throw new Error(`Failed to create issues: ${issuesError.message}`)
  }

  console.log('✅ Created', issuesData.length, 'issue records')
}

async function updateScanStatus(
  supabase: TypedSupabaseClient,
  scanId: string,
  status: ScanInsert['status'],
  scanResult?: Awaited<ReturnType<typeof runA11yScan>>
): Promise<void> {
  console.log('📝 Updating scan status:', { scanId, status })
  
  const updateData: Partial<ScanInsert> = {
    status,
    finished_at: new Date().toISOString()
  }

  // Add scan metrics if available
  if (scanResult) {
    updateData.total_violations = scanResult.totalViolations
    updateData.passes = scanResult.passes
    updateData.incomplete = scanResult.incomplete
    updateData.inapplicable = scanResult.inapplicable
    updateData.scan_time_ms = scanResult.timeToScan
  }

  const { error: updateError } = await supabase
    .from('scans')
    .update(updateData)
    .eq('id', scanId)

  if (updateError) {
    console.error('❌ Failed to update scan status:', updateError)
    throw new Error(`Failed to update scan status: ${updateError.message}`)
  }

  console.log('✅ Scan status updated')
}

export async function POST(request: NextRequest) {
  console.log('\n🚀 Starting new scan request')
  console.log('==========================')

  try {
    // 1. Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ Unauthorized - no session or user ID')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('✅ User authenticated:', session.user.id)

    // 2. Parse request body
    const body = await request.json() as ScanRequestBody
    if (!body.siteId) {
      console.log('❌ Missing siteId in request')
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    }

    // 3. Initialize Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string) {
            cookieStore.set(name, value)
          },
          remove(name: string) {
            cookieStore.delete(name)
          }
        }
      }
    )

    // 4. Get or create user
    const user = await getOrCreateUser(supabase, session.user.id)

    // 5. Verify site ownership
    const site = await verifySiteOwnership(supabase, body.siteId, user.id)

    // 6. Create initial scan record
    const scan = await createScan(supabase, site.id)

    // 7. Run accessibility scan
    console.log('🔍 Running accessibility scan for:', site.url)
    const scanResult = await runA11yScan(body.url || site.url)
    console.log('✅ Scan completed')

    // 8. Store issues
    await createIssues(supabase, scan.id, scanResult)

    // 9. Update scan status
    await updateScanStatus(supabase, scan.id, 'completed', scanResult)

    // 10. Return success response
    return NextResponse.json({
      success: true,
      data: {
        scan: {
          id: scan.id,
          status: 'completed',
          total_violations: scanResult.totalViolations,
          passes: scanResult.passes,
          incomplete: scanResult.incomplete,
          inapplicable: scanResult.inapplicable,
          scan_time_ms: scanResult.timeToScan
        }
      }
    })

  } catch (error) {
    console.error('❌ Scan error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run scan' },
      { status: 500 }
    )
  }
} 
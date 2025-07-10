import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { createServerClient } from '@supabase/ssr'
import { runA11yScan } from '../../../../scripts/runA11yScan'
import type { Database } from '@/app/types/database'
import type { ScanInsert, IssueInsert, SeverityLevel } from '@/app/types/database'
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
    score: null,
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

  // Log issue breakdown
  const breakdown = scanResult.summary.byImpact
  console.log('📊 Issues by severity:')
  console.table(breakdown)

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
  score?: number | null
): Promise<void> {
  console.log('📝 Updating scan status:', { scanId, status, score })
  
  const { error: updateError } = await supabase
    .from('scans')
    .update({
      status,
      score,
      finished_at: new Date().toISOString()
    })
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
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set(name, value, options)
            } catch {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set(name, '', options)
            } catch {
              // The `remove` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          }
        }
      }
    )

    // 4. Get or create Supabase user
    const supabaseUser = await getOrCreateUser(supabase, session.user.id)

    // 5. Verify site ownership
    const site = await verifySiteOwnership(supabase, body.siteId, supabaseUser.id)

    // 6. Create initial scan record
    const scan = await createScan(supabase, site.id)

    try {
      // 7. Run accessibility scan
      console.log('🔍 Starting accessibility scan for:', site.url)
      const scanResult = await runA11yScan(body.url || site.url)
      console.log('✅ Scan completed with score:', scanResult.score)

      // 8. Create issue records
      await createIssues(supabase, scan.id, scanResult)

      // 9. Update scan status to completed
      await updateScanStatus(supabase, scan.id, 'completed', scanResult.score)

      // 10. Return success response
      console.log('🎉 Scan process completed successfully')
      return NextResponse.json({
        success: true,
        data: {
          scan: {
            id: scan.id,
            score: scanResult.score,
            status: 'completed'
          },
          summary: scanResult.summary
        }
      })

    } catch (error) {
      // Handle scan-specific errors
      console.error('❌ Error during scan process:', error)
      await updateScanStatus(supabase, scan.id, 'failed')
      return NextResponse.json({
        error: 'Failed to complete accessibility scan',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    // Handle general errors
    console.error('❌ Unhandled error in scan endpoint:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { supabaseAdmin } from '@/app/lib/supabase/server'
import { createAccessibilityIssue, parseRepoString, validateTokenPermissions } from '@/lib/github'
import { getRemediationGuide } from '@/lib/remediation-guide'
import { scanAnalytics } from '@/lib/safe-analytics'

const isDev = process.env.NODE_ENV === 'development'

interface CreateIssueRequest {
  siteId: string
  scanId: string
  violation: {
    id: string
    ruleId: string
    impact: 'critical' | 'serious' | 'moderate' | 'minor'
    selector: string
    html?: string
    description: string
    wcagTags?: string[]
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [github/create-issue] Starting GitHub issue creation')
    
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error('❌ [github/create-issue] Unauthorized: No session')
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    console.log('✅ [github/create-issue] User authenticated:', userId)

    // 2. Parse request body
    const body: CreateIssueRequest = await request.json()
    const { siteId, scanId, violation } = body

    console.log('📋 [github/create-issue] Request:', {
      siteId,
      scanId,
      violationId: violation.id,
      ruleId: violation.ruleId
    })

    // 3. Get site details first
    console.log('🔍 [github/create-issue] Fetching site:', siteId)
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, name, url, team_id, github_repo, repository_mode')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      console.error('❌ [github/create-issue] Site not found:', {
        siteId,
        error: siteError,
        errorCode: siteError?.code,
        errorMessage: siteError?.message,
        errorDetails: siteError?.details
      })
      return NextResponse.json(
        { error: 'Site not found', code: 'SITE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 4. Verify user has access to this site via team membership
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('team_members')
      .select('user_id, role, team_id')
      .eq('team_id', site.team_id)
      .eq('user_id', userId)
      .single()

    if (membershipError || !membership) {
      console.error('❌ [github/create-issue] Access denied - not a team member:', {
        userId,
        teamId: site.team_id,
        error: membershipError
      })
      return NextResponse.json(
        { error: 'Access denied - you are not a member of this site\'s team', code: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    console.log('✅ [github/create-issue] Site access verified:', {
      siteId: site.id,
      siteName: site.name,
      teamId: site.team_id,
      userRole: membership.role,
      hasRepo: !!site.github_repo,
      mode: site.repository_mode || 'issue_only'
    })

    // 5. Check if GitHub repo is configured
    if (!site.github_repo) {
      console.warn('⚠️ [github/create-issue] GitHub repo not configured for site:', siteId)
      return NextResponse.json(
        { 
          error: 'GitHub repository not configured for this site. Please configure it in site settings.',
          code: 'REPO_NOT_CONFIGURED',
          siteId: site.id,
          siteName: site.name
        },
        { status: 400 }
      )
    }

    // 6. Parse and validate repo format
    const repoParts = parseRepoString(site.github_repo)
    if (!repoParts) {
      console.error('❌ [github/create-issue] Invalid repo format:', site.github_repo)
      return NextResponse.json(
        { 
          error: 'Invalid repository format. Expected: owner/repo',
          code: 'INVALID_REPO_FORMAT',
          repo: site.github_repo
        },
        { status: 400 }
      )
    }

    console.log('✅ [github/create-issue] Repo parsed:', repoParts)

    // 7. Validate environment configuration
    const githubToken = process.env.GITHUB_TOKEN
    const missingEnv: string[] = []
    
    if (!githubToken) {
      missingEnv.push('GITHUB_TOKEN')
    }
    
    if (missingEnv.length > 0) {
      console.error('❌ [github/create-issue] Missing environment variables:', missingEnv)
      return NextResponse.json(
        { 
          error: 'GitHub integration not configured',
          message: `Missing required environment variables: ${missingEnv.join(', ')}`,
          code: 'missing_env',
          needed: missingEnv,
          actionable: 'Add the required environment variables to .env.local and restart your server.'
        },
        { status: 400 } // 400 not 503 - configuration error, not service unavailable
      )
    }

    // 8. Validate token permissions before attempting to create issue
    console.log('🔐 [github/create-issue] Validating token permissions...')
    const permCheck = await validateTokenPermissions(
      githubToken!, // Safe: checked above
      repoParts.owner,
      repoParts.repo
    )
    
    if (!permCheck.valid) {
      console.error('❌ [github/create-issue] Token permission check failed:', {
        code: permCheck.code,
        error: permCheck.error
      })
      
      if (permCheck.code === 'insufficient_permissions') {
        return NextResponse.json(
          {
            error: permCheck.error || 'Token lacks required permissions',
            message: 'The GitHub token does not have sufficient permissions to create issues in this repository.',
            code: 'insufficient_permissions',
            required: ['issues:write', 'contents:read', 'metadata:read'],
            current: {
              hasIssuesWrite: permCheck.hasIssuesWrite,
              hasContentsRead: permCheck.hasContentsRead,
              hasMetadataRead: permCheck.hasMetadataRead,
              scopes: permCheck.scopes
            },
            actionable: 'Update your GitHub token with the required permissions and try again.'
          },
          { status: 403 }
        )
      }
      
      // Handle other permission errors
      return NextResponse.json(
        {
          error: permCheck.error || 'Failed to validate token permissions',
          code: permCheck.code || 'validation_failed'
        },
        { status: 400 }
      )
    }
    
    console.log('✅ [github/create-issue] Token permissions validated:', {
      hasIssuesWrite: permCheck.hasIssuesWrite,
      hasContentsRead: permCheck.hasContentsRead,
      scopes: permCheck.scopes
    })

    // 9. Get comprehensive remediation guide for the violation
    const remediationGuide = getRemediationGuide(
      violation.ruleId,
      violation.html,
      violation.selector
    )

    console.log('📚 [github/create-issue] Remediation guide loaded:', {
      rule: violation.ruleId,
      stepsCount: remediationGuide.steps.length,
      hasCodeExample: !!remediationGuide.codeExample
    })

    // 10. Construct URLs
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const reportUrl = `${baseUrl}/dashboard/scans/${scanId}`
    const violationDetailUrl = `${baseUrl}/dashboard/scans/${scanId}#violation-${violation.id}`

    // Check if this violation already has a GitHub issue
    const { data: existingIssue } = await supabaseAdmin
      .from('issues')
      .select('github_issue_url, github_issue_number')
      .eq('id', violation.id)
      .single()
    
    if (existingIssue?.github_issue_url) {
      console.log('ℹ️ [github/create-issue] Issue already exists:', {
        violationId: violation.id,
        issueUrl: existingIssue.github_issue_url,
        issueNumber: existingIssue.github_issue_number
      })
      
      // Return existing issue instead of creating duplicate
      return NextResponse.json({
        success: true,
        issueUrl: existingIssue.github_issue_url,
        issueNumber: existingIssue.github_issue_number,
        repo: site.github_repo,
        existing: true
      })
    }

    // Get repository mode (default to issue_only for backward compatibility)
    const repositoryMode = (site.repository_mode || 'issue_only') as 'issue_only' | 'pr'

    // 11. Create GitHub issue
    console.log('🚀 [github/create-issue] Creating GitHub issue...', {
      mode: repositoryMode,
      repo: site.github_repo
    })
    
    const issueResult = await createAccessibilityIssue({
      config: {
        token: githubToken!, // Safe: checked above
        owner: repoParts.owner,
        repo: repoParts.repo
      },
      violation: {
        ruleId: violation.ruleId,
        impact: violation.impact,
        selector: violation.selector,
        html: violation.html,
        description: violation.description,
        wcagTags: violation.wcagTags || [],
        wcagReference: remediationGuide.wcagCriteria,
        howToFixSteps: remediationGuide.steps,
        codeExample: remediationGuide.codeExample
      },
      siteUrl: site.url,
      scanId,
      reportUrl,
      violationDetailUrl,
      mode: repositoryMode
    })

    console.log('✅ [github/create-issue] Issue created successfully:', {
      issueUrl: issueResult.url,
      issueNumber: issueResult.number
    })
    
    // 12. Save GitHub issue link to the violation in database
    console.log('💾 [github/create-issue] Saving GitHub issue link to violation:', violation.id)
    
    const { error: updateError } = await supabaseAdmin
      .from('issues')
      .update({
        github_issue_url: issueResult.url,
        github_issue_number: issueResult.number,
        github_issue_created_at: new Date().toISOString()
      })
      .eq('id', violation.id)
    
    if (updateError) {
      console.error('⚠️ [github/create-issue] Failed to save issue link to DB (non-fatal):', updateError)
      // Don't fail the request - issue was created successfully in GitHub
    } else {
      console.log('✅ [github/create-issue] Issue link saved to database')
    }
    
    // Dev-only: Log diagnostic info
    if (isDev) {
      console.log('📊 [github/create-issue] [DEV] Issue created:', {
        repo: site.github_repo,
        ruleId: violation.ruleId,
        severity: violation.impact,
        issueNumber: issueResult.number
      })
    }

    // 13. Track analytics
    scanAnalytics.track('github_issue_created', {
      scanId,
      siteId,
      ruleId: violation.ruleId,
      issueUrl: issueResult.url,
      issueNumber: issueResult.number,
      impact: violation.impact,
      repo: site.github_repo
    })

    // 14. Return success response
    return NextResponse.json({
      success: true,
      issueUrl: issueResult.url,
      issueNumber: issueResult.number,
      repo: site.github_repo
    })

  } catch (error: any) {
    console.error('❌ [github/create-issue] Error creating GitHub issue:', error)
    
    // Handle specific GitHub API errors with user-actionable messages
    if (error.status === 404) {
      return NextResponse.json(
        { 
          error: 'Repository not found or you don\'t have access',
          code: 'REPO_NOT_FOUND',
          actionable: 'Please verify the repository name is correct and your GitHub token has access to it.'
        },
        { status: 404 }
      )
    }
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { 
          error: 'GitHub authentication failed',
          code: 'GITHUB_AUTH_FAILED',
          actionable: 'Please verify your GITHUB_TOKEN has the "repo" scope and access to this repository.'
        },
        { status: 403 }
      )
    }
    
    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        { 
          error: 'GitHub API rate limit exceeded',
          code: 'RATE_LIMIT',
          actionable: 'Please wait a few minutes and try again.'
        },
        { status: 429 }
      )
    }
    
    // Generic error - no stack traces to user
    return NextResponse.json(
      { 
        error: 'Failed to create GitHub issue',
        code: 'GITHUB_ERROR',
        actionable: 'Please try again. If the problem persists, contact support.'
      },
      { status: 500 }
    )
  }
}

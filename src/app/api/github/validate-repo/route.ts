import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { validateRepository, parseRepoString } from '@/lib/github'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // 2. Get GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN
    if (!githubToken) {
      return NextResponse.json(
        { 
          error: 'GitHub integration not configured. Please add GITHUB_TOKEN to your environment variables.',
          code: 'GITHUB_NOT_CONFIGURED',
          actionable: 'Contact your administrator to set up the GitHub integration.'
        },
        { status: 503 }
      )
    }

    // 3. Parse request body
    const { repository } = await request.json()

    if (!repository) {
      return NextResponse.json(
        { error: 'Repository is required', code: 'MISSING_REPOSITORY' },
        { status: 400 }
      )
    }

    // 4. Validate repository format
    const repoParts = parseRepoString(repository)
    if (!repoParts) {
      return NextResponse.json(
        { 
          error: 'Invalid repository format. Use: owner/repo',
          code: 'INVALID_FORMAT',
          example: 'acme-corp/website'
        },
        { status: 400 }
      )
    }

    // 5. Validate repository exists and is accessible
    const validation = await validateRepository(
      githubToken,
      repoParts.owner,
      repoParts.repo
    )

    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.error,
          code: validation.exists === false ? 'REPO_NOT_FOUND' : 'ACCESS_DENIED'
        },
        { status: 404 }
      )
    }

    // 6. Return success
    return NextResponse.json({
      valid: true,
      repository,
      owner: repoParts.owner,
      repo: repoParts.repo,
      isPrivate: validation.isPrivate,
      hasAccess: validation.hasAccess
    })

  } catch (error: any) {
    console.error('❌ [github/validate-repo] Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to validate repository',
        code: 'VALIDATION_ERROR',
        details: error.message
      },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { parseRepoString } from '@/lib/github'

/**
 * GitHub Integration Health Check
 * Returns configuration status without exposing secrets
 */
export async function GET() {
  const token = process.env.GITHUB_TOKEN
  const defaultRepo = process.env.GITHUB_REPO_DEFAULT

  // Parse default repo if provided
  let parsedRepo: { owner: string; repo: string } | null = null
  let repoError: string | null = null

  if (defaultRepo) {
    parsedRepo = parseRepoString(defaultRepo)
    if (!parsedRepo) {
      repoError = 'Invalid format. Expected: owner/repo'
    }
  }

  return NextResponse.json({
    configured: {
      token: !!token,
      defaultRepo: !!defaultRepo
    },
    defaultRepo: parsedRepo
      ? {
          owner: parsedRepo.owner,
          repo: parsedRepo.repo,
          full: defaultRepo
        }
      : null,
    errors: repoError ? { defaultRepo: repoError } : null,
    ready: !!token && (!!parsedRepo || !defaultRepo) // Ready if token exists and repo is valid (if provided)
  })
}

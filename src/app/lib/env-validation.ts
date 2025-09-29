/**
 * Environment validation utilities
 * Validates critical environment variables at boot time
 */

let hasValidated = false

export function validateAuthEnvironment(): void {
  // Only validate once to avoid repeated console spam
  if (hasValidated) return
  hasValidated = true

  const requiredVars = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
  }

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    console.error('🚨 CRITICAL: Missing required environment variables:', missing.join(', '))
    console.error('   Please check your .env.local file and ensure all required variables are set.')
    
    if (process.env.NODE_ENV === 'development') {
      console.error('   For development, ensure NEXTAUTH_URL=http://localhost:3000')
    }
  } else {
    console.log('✅ Auth environment variables validated')
    
    // Validate development URLs
    if (process.env.NODE_ENV === 'development') {
      if (process.env.NEXTAUTH_URL !== 'http://localhost:3000') {
        console.warn('⚠️  Development NEXTAUTH_URL should be http://localhost:3000, got:', process.env.NEXTAUTH_URL)
      }
    }
  }
}

export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasGitHubId: !!process.env.GITHUB_ID,
    hasGitHubSecret: !!process.env.GITHUB_SECRET,
  }
}

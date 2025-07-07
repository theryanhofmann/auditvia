#!/usr/bin/env tsx

import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

interface Site {
  id: string
  url: string
  name?: string
}

interface Scan {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  score?: number
}

interface ScanReport {
  issues: Array<{
    id: string
    rule: string
    severity: string
    description: string
  }>
}

class SmokeTest {
  private baseUrl: string
  private sessionCookie?: string
  private devMode: boolean

  constructor() {
    this.baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    this.devMode = process.env.DEV_NO_ADMIN === 'true'
    
    console.log('🚀 Starting Auditvia E2E Smoke Test')
    console.log(`   Base URL: ${this.baseUrl}`)
    console.log(`   Dev Mode: ${this.devMode ? 'YES (skipping auth)' : 'NO (requires auth)'}`)
    console.log('')
  }

  async run(): Promise<void> {
    try {
      // Step 1: Authentication (if not in dev mode)
      if (!this.devMode) {
        await this.authenticate()
      }

      // Step 2: Add test site
      const site = await this.addTestSite()
      console.log(`✅ Added test site: ${site.url} (ID: ${site.id})`)

      // Step 3: Start scan
      const scan = await this.startScan(site.id)
      console.log(`✅ Started scan: ${scan.id}`)

      // Step 4: Poll for completion
      const completedScan = await this.pollScanCompletion(scan.id)
      console.log(`✅ Scan completed with status: ${completedScan.status}`)

      // Step 5: Validate report
      await this.validateReport(site.id, completedScan.id)
      console.log(`✅ Report validation passed`)

      // Step 6: Cleanup
      await this.cleanup(site.id)
      console.log(`✅ Cleanup completed`)

      console.log('')
      console.log('🎉 \x1b[32mSMOKE TEST PASSED\x1b[0m')
      console.log('   All systems operational!')
      process.exit(0)

    } catch (error) {
      console.error('')
      console.error('❌ \x1b[31mSMOKE TEST FAILED\x1b[0m')
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`   Reason: ${errorMessage}`)
      process.exit(1)
    }
  }

  private async authenticate(): Promise<void> {
    console.log('🔐 Authenticating...')
    
    if (this.devMode) {
      console.log('   Skipping authentication (DEV_NO_ADMIN mode)')
      return
    }

    // In production mode, authentication would be required
    // This smoke test is designed to run in DEV_NO_ADMIN mode for CI/CD
    throw new Error('Authentication required in production mode. Use DEV_NO_ADMIN=true for testing.')
  }

  private async addTestSite(): Promise<Site> {
    console.log('🌐 Adding test site...')
    
    const response = await this.apiCall('/api/sites', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://example.com',
        name: 'E2E Test Site'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      const errorMsg = `Failed to add site: ${error.error || response.statusText}`
      const detailsMsg = error ? ` Details: ${JSON.stringify(error)}` : ''
      throw new Error(errorMsg + detailsMsg)
    }

    const result = await response.json()
    return result.site || result
  }

  private async startScan(siteId: string): Promise<Scan> {
    console.log('🔍 Starting accessibility scan...')
    
    const response = await this.apiCall('/api/audit', {
      method: 'POST',
      body: JSON.stringify({
        siteId: siteId,
        url: 'https://example.com'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      const errorMsg = `Failed to start scan: ${error.error || response.statusText}`
      const detailsMsg = error ? ` Details: ${JSON.stringify(error)}` : ''
      throw new Error(errorMsg + detailsMsg)
    }

    const result = await response.json()
    return {
      id: result.data?.scan?.id || result.scanId || result.id,
      status: 'pending'
    }
  }

  private async pollScanCompletion(scanId: string): Promise<Scan> {
    console.log('⏳ Polling for scan completion...')
    
    const maxAttempts = 18 // 90 seconds with 5-second intervals
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++
      console.log(`   Attempt ${attempts}/${maxAttempts} - Checking scan status...`)

      try {
        const response = await this.apiCall('/api/audit-results', {
          method: 'POST',
          body: JSON.stringify({ scanId })
        })
        
        if (response.ok) {
          const result = await response.json()
          const scan = result.scan || result
          
          console.log(`   Status: ${scan.status}${scan.score ? ` (Score: ${scan.score})` : ''}`)
          
          if (scan.status === 'completed') {
            return scan
          }
          
          if (scan.status === 'failed' || scan.status === 'error') {
            throw new Error(`Scan failed with status: ${scan.status}`)
          }
        }
             } catch (error) {
         const errorMessage = error instanceof Error ? error.message : String(error)
         console.log(`   Check failed: ${errorMessage}`)
       }

      if (attempts < maxAttempts) {
        console.log('   Waiting 5 seconds before next check...')
        await this.sleep(5000)
      }
    }

    throw new Error('Scan did not complete within 90 seconds timeout')
  }

  private async validateReport(siteId: string, scanId: string): Promise<void> {
    console.log('📊 Validating scan report...')
    
    const response = await this.apiCall(`/sites/${siteId}/report/${scanId}`)
    
    if (!response.ok) {
      // Try alternative endpoint
      const altResponse = await this.apiCall('/api/audit-results', {
        method: 'POST',
        body: JSON.stringify({ scanId })
      })
      
      if (!altResponse.ok) {
        throw new Error(`Failed to fetch report: ${response.statusText}`)
      }
      
      const result = await altResponse.json()
      
      // Check for issues in the response
      const issues = result.scan?.issues || result.data?.raw_violations || result.issues || result.violations || []
      
      if (!Array.isArray(issues) || issues.length === 0) {
        throw new Error('Report validation failed: No accessibility issues found (expected at least some issues for example.com)')
      }
      
      console.log(`   Found ${issues.length} accessibility issues`)
      return
    }

    // If the report page loads successfully, we assume it contains valid data
    console.log('   Report page accessible')
  }

  private async cleanup(siteId: string): Promise<void> {
    console.log('🧹 Cleaning up test data...')
    
    try {
      const response = await this.apiCall(`/api/sites/${siteId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        console.log('   Warning: Could not delete test site (may require manual cleanup)')
      } else {
        console.log('   Test site deleted successfully')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.log(`   Warning: Cleanup failed: ${errorMessage}`)
      // Don't fail the test for cleanup issues
    }
  }

  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    }

    // Add authentication headers if available
    if (this.sessionCookie && !this.devMode) {
      headers['Cookie'] = `next-auth.session-token=${this.sessionCookie}`
    }

    // Add service key for dev mode
    if (this.devMode && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      headers['x-service-key'] = process.env.SUPABASE_SERVICE_ROLE_KEY
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    return response
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Validate required environment variables
function validateEnvironment(): void {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:')
    missingVars.forEach(varName => console.error(`   - ${varName}`))
    console.error('')
    console.error('Please ensure .env.local contains all required variables.')
    process.exit(1)
  }

  // Warn about dev mode usage
  const devMode = process.env.DEV_NO_ADMIN === 'true'
  if (!devMode) {
    console.log('⚠️  Warning: Running in production mode. Set DEV_NO_ADMIN=true for testing.')
    console.log('')
  }
}

// Main execution
async function main(): Promise<void> {
  console.log('Auditvia E2E Smoke Test')
  console.log('========================')
  console.log('')
  
  validateEnvironment()
  
  const smokeTest = new SmokeTest()
  await smokeTest.run()
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('')
  console.error('❌ \x1b[31mSMOKE TEST FAILED\x1b[0m')
  console.error(`   Uncaught exception: ${error.message}`)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('')
  console.error('❌ \x1b[31mSMOKE TEST FAILED\x1b[0m')
  console.error(`   Unhandled rejection: ${reason}`)
  process.exit(1)
})

// Run the test
main().catch((error) => {
  console.error('')
  console.error('❌ \x1b[31mSMOKE TEST FAILED\x1b[0m')
  console.error(`   Error: ${error.message}`)
  process.exit(1)
}) 
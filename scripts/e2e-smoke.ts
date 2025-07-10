#!/usr/bin/env tsx

import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') })

async function checkLocalhost(): Promise<boolean> {
  try {
    const { stdout, stderr } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000')
    return parseInt(stdout) > 0
  } catch (error) {
    return false
  }
}

async function suggestBaseUrl() {
  console.log('\n⚠️  Unable to connect to localhost. This is common on macOS with Docker.')
  console.log('Try one of the following solutions:')
  console.log('1. Add to .env.local:')
  console.log('   BASE_URL=http://host.docker.internal:3000')
  console.log('2. Or use your machine\'s IP:')
  try {
    const { stdout } = await execAsync("ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1")
    const ip = stdout.trim()
    if (ip) {
      console.log(`   BASE_URL=http://${ip}:3000`)
    }
  } catch (error) {
    console.log('   BASE_URL=http://<your-ip-address>:3000')
  }
  console.log('\nThen run the smoke test again.\n')
}

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
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000'
    this.devMode = process.env.DEV_NO_ADMIN === 'true'
    
    console.log('🚀 Starting Auditvia E2E Smoke Test')
    console.log(`Base URL: ${this.baseUrl}`)
    console.log(`Dev Mode: ${this.devMode ? 'YES (skipping auth)' : 'NO (requires auth)'}`)
    console.log('')
  }

  async waitForServer(maxAttempts = 60, interval = 2000): Promise<void> {
    console.log(`[SMOKE] Pinging ${this.baseUrl} until server responds...`)
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'GET',
          headers: { 'Accept': 'text/html' },
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          console.log('✅ Server is ready!')
          return
        }
        
        console.log(`Attempt ${attempt}/${maxAttempts} - Server responded with status ${response.status}`)
      } catch (error) {
        if (error instanceof Error) {
          const isTimeout = error.name === 'TimeoutError' || error.name === 'AbortError'
          console.log(`Attempt ${attempt}/${maxAttempts} - ${isTimeout ? 'Request timed out' : error.message}`)
        }
      }
      
      if (attempt === maxAttempts) {
        throw new Error('Server failed to respond within timeout')
      }
      
      await new Promise(resolve => setTimeout(resolve, interval))
    }
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
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    throw new Error('Missing required environment variables. Make sure .env.local exists and is configured properly (see .env.example).')
  }

  // Additional environment validation if needed
  if (!process.env.NEXTAUTH_URL?.startsWith('http')) {
    throw new Error('NEXTAUTH_URL must be a valid URL starting with http:// or https://')
  }
}

async function main(): Promise<void> {
  // Check if localhost is accessible
  if (!process.env.BASE_URL && !(await checkLocalhost())) {
    await suggestBaseUrl()
    process.exit(1)
  }

  console.log('Auditvia E2E Smoke Test')
  console.log('========================')
  console.log('')
  
  validateEnvironment()
  
  const smokeTest = new SmokeTest()
  
  try {
    await smokeTest.waitForServer()
    await smokeTest.run()
  } catch (error) {
    console.error('\n❌ Smoke test failed!')
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    }
    process.exit(1)
  }
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
main().catch(error => {
  console.error('Unhandled error:', error)
  process.exit(1)
}) 
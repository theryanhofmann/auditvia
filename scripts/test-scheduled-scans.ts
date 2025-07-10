#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface Site {
  id: string
  url: string
  name: string | null
  custom_domain: string | null
  user_id: string
  monitoring: boolean
}

interface TestResult {
  siteId: string
  siteName: string
  siteUrl: string
  scannedUrl: string
  success: boolean
  scanId?: string
  score?: number
  violations?: number
  errorMessage?: string
  executionTime: number
}

async function testScheduledScans() {
  console.log('🧪 Testing Scheduled Scans Functionality')
  console.log('=========================================\n')

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const startTime = Date.now()

  try {
    // 1. Fetch sites with monitoring enabled
    console.log('📊 Fetching sites with monitoring enabled...')
    const { data: sites, error: sitesError } = await supabase
      .from('sites')
      .select('id, url, name, custom_domain, user_id, monitoring')
      .eq('monitoring', true)

    if (sitesError) {
      console.error('❌ Error fetching sites:', sitesError)
      return
    }

    if (!sites || sites.length === 0) {
      console.log('ℹ️ No sites with monitoring enabled found')
      console.log('💡 Tip: Enable monitoring for some sites in the dashboard to test this functionality')
      return
    }

    console.log(`✅ Found ${sites.length} sites with monitoring enabled:\n`)

    // 2. Display sites that would be scanned
    sites.forEach((site, index) => {
      const displayName = site.name || new URL(site.url).hostname
      const scanUrl = site.custom_domain ? `https://${site.custom_domain}` : site.url
      
      console.log(`${index + 1}. ${displayName}`)
      console.log(`   Original URL: ${site.url}`)
      if (site.custom_domain) {
        console.log(`   Custom Domain: ${site.custom_domain}`)
        console.log(`   Will scan: ${scanUrl} (using custom domain)`)
      } else {
        console.log(`   Will scan: ${scanUrl} (using original URL)`)
      }
      console.log(`   Site ID: ${site.id}`)
      console.log('')
    })

    // 3. Simulate scanning (without actually running scans in test mode)
    const shouldRunActualScans = process.argv.includes('--run-scans')
    
    if (!shouldRunActualScans) {
      console.log('🔍 Simulation Mode')
      console.log('================')
      console.log('This was a simulation. To run actual scans, use: npm run test:scheduled-scans -- --run-scans')
      console.log('⚠️  Warning: This will consume scan quota and may take several minutes\n')
      
      // Show what would happen
      sites.forEach((site, index) => {
        const scanUrl = site.custom_domain ? `https://${site.custom_domain}` : site.url
        console.log(`${index + 1}. Would scan: ${scanUrl}`)
        console.log(`   Expected scan duration: ~30-60 seconds`)
        console.log(`   Would create scan record in database`)
        console.log(`   Would log result to scheduled_scan_logs table`)
        console.log('')
      })
      
      return
    }

    // 4. Run actual scans
    console.log('🚀 Running Actual Scans')
    console.log('=======================')
    console.log('⚠️  This will take several minutes and consume scan quota\n')

    const testResults: TestResult[] = []
    let successfulScans = 0
    let failedScans = 0

    for (const [index, site] of sites.entries()) {
      const siteStartTime = Date.now()
      console.log(`🔍 [${index + 1}/${sites.length}] Scanning: ${site.name || site.url}`)

      try {
        // Determine URL to scan
        const urlToScan = site.custom_domain 
          ? `https://${site.custom_domain}`
          : site.url

        console.log(`   📡 Scanning URL: ${urlToScan}`)

        // Call the audit API (same logic as Edge Function)
        const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const auditResponse = await fetch(`${appUrl}/api/audit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-service-key': supabaseKey
          },
          body: JSON.stringify({
            url: site.url, // Keep original URL for site reference
            siteId: site.id,
            userId: site.user_id
          })
        })

        const executionTime = Date.now() - siteStartTime

        if (!auditResponse.ok) {
          const errorText = await auditResponse.text()
          throw new Error(`Audit API failed: ${auditResponse.status} - ${errorText}`)
        }

        const auditData = await auditResponse.json()

        if (auditData.success) {
          console.log(`   ✅ Success! Score: ${auditData.summary?.score || 'N/A'}, Violations: ${auditData.summary?.violations || 'N/A'}`)
          
          const result: TestResult = {
            siteId: site.id,
            siteName: site.name || new URL(site.url).hostname,
            siteUrl: site.url,
            scannedUrl: urlToScan,
            success: true,
            scanId: auditData.data?.scan?.id,
            score: auditData.summary?.score,
            violations: auditData.summary?.violations,
            executionTime
          }
          
          testResults.push(result)
          successfulScans++

          // Log to scheduled_scan_logs
          const { error: logError } = await supabase
            .from('scheduled_scan_logs')
            .insert({
              site_id: site.id,
              scan_id: auditData.data?.scan?.id,
              status: 'success',
              scanned_url: urlToScan,
              execution_time_ms: executionTime
            })

          if (logError) {
            console.log(`   ⚠️  Warning: Failed to log success: ${logError.message}`)
          } else {
            console.log(`   📝 Logged success to scheduled_scan_logs`)
          }

        } else {
          throw new Error(auditData.error || 'Audit failed without specific error')
        }

      } catch (error) {
        const executionTime = Date.now() - siteStartTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        console.log(`   ❌ Failed: ${errorMessage}`)
        
        const result: TestResult = {
          siteId: site.id,
          siteName: site.name || new URL(site.url).hostname,
          siteUrl: site.url,
          scannedUrl: site.custom_domain ? `https://${site.custom_domain}` : site.url,
          success: false,
          errorMessage,
          executionTime
        }
        
        testResults.push(result)
        failedScans++

        // Log failure to scheduled_scan_logs
        const { error: logError } = await supabase
          .from('scheduled_scan_logs')
          .insert({
            site_id: site.id,
            status: 'failure',
            scanned_url: site.custom_domain ? `https://${site.custom_domain}` : site.url,
            error_message: errorMessage,
            execution_time_ms: executionTime
          })

        if (logError) {
          console.log(`   ⚠️  Warning: Failed to log error: ${logError.message}`)
        } else {
          console.log(`   📝 Logged failure to scheduled_scan_logs`)
        }
      }

      console.log('')
    }

    // 5. Summary
    const totalExecutionTime = Date.now() - startTime
    const averageScore = testResults
      .filter(r => r.success && r.score !== undefined)
      .reduce((sum, r) => sum + (r.score || 0), 0) / Math.max(successfulScans, 1)

    console.log('📊 Test Results Summary')
    console.log('======================')
    console.log(`Total sites processed: ${sites.length}`)
    console.log(`Successful scans: ${successfulScans}`)
    console.log(`Failed scans: ${failedScans}`)
    console.log(`Average score: ${Math.round(averageScore)}`)
    console.log(`Total execution time: ${Math.round(totalExecutionTime / 1000)}s`)
    console.log('')

    if (successfulScans > 0) {
      console.log('✅ Successful Scans:')
      testResults
        .filter(r => r.success)
        .forEach(r => {
          console.log(`   • ${r.siteName} - Score: ${r.score}, Violations: ${r.violations}`)
        })
      console.log('')
    }

    if (failedScans > 0) {
      console.log('❌ Failed Scans:')
      testResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   • ${r.siteName} - Error: ${r.errorMessage}`)
        })
      console.log('')
    }

    console.log('🎯 Test completed successfully!')

  } catch (error) {
    console.error('💥 Test failed with error:', error)
    process.exit(1)
  }
}

// Run the test
testScheduledScans().catch(console.error) 
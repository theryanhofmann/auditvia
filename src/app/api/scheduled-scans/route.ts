import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase/server'

interface ScanResult {
  siteId: string
  url: string
  success: boolean
  score?: number
  violations?: number
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key for security
    const authHeader = request.headers.get('Authorization')
    const apiKey = authHeader?.replace('Bearer ', '')
    
    if (!apiKey || apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting scheduled scans...')

    // Get all sites with monitoring enabled
    const { data: sites, error: sitesError } = await supabaseAdmin
      .from('sites')
      .select('*')
      .eq('monitoring', true)

    if (sitesError) {
      console.error('Error fetching monitored sites:', sitesError)
      return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
    }

    if (!sites || sites.length === 0) {
      console.log('No sites with monitoring enabled')
      return NextResponse.json({ message: 'No sites to scan', scanned: 0 })
    }

    console.log(`Found ${sites.length} sites to scan`)

    // Process sites in batches to avoid overwhelming the system
    const batchSize = 3
    const delay = 5000 // 5 seconds between batches
    const results: ScanResult[] = []

    for (let i = 0; i < sites.length; i += batchSize) {
      const batch = sites.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sites.length / batchSize)}`)

      const batchPromises = batch.map(async (site) => {
        try {
          console.log(`Scanning site: ${site.url}`)
          
          // Update site status to scanning
          await supabaseAdmin
            .from('sites')
            .update({ 
              status: 'scanning',
              updated_at: new Date().toISOString()
            })
            .eq('id', site.id)

          // Call the audit API for this site
          const auditResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/audit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: site.url,
              siteId: site.id,
              userId: site.user_id,
            }),
          })

          if (!auditResponse.ok) {
            throw new Error(`Audit failed: ${auditResponse.status}`)
          }

          const auditResult = await auditResponse.json()
          console.log(`Scan completed for ${site.url}: score ${auditResult.summary?.score}`)

          return {
            siteId: site.id,
            url: site.url,
            success: true,
            score: auditResult.summary?.score,
            violations: auditResult.summary?.violations,
          }

        } catch (error) {
          console.error(`Error scanning site ${site.url}:`, error)
          
          // Update site status to error
          await supabaseAdmin
            .from('sites')
            .update({ 
              status: 'error',
              updated_at: new Date().toISOString()
            })
            .eq('id', site.id)

          return {
            siteId: site.id,
            url: site.url,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error(`Batch error for site ${batch[index].url}:`, result.reason)
          results.push({
            siteId: batch[index].id,
            url: batch[index].url,
            success: false,
            error: result.reason?.message || 'Batch processing failed',
          })
        }
      })

      // Add delay between batches (except for the last batch)
      if (i + batchSize < sites.length) {
        console.log(`Waiting ${delay}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`Scheduled scans completed: ${successful} successful, ${failed} failed`)

    return NextResponse.json({
      message: 'Scheduled scans completed',
      total: sites.length,
      successful,
      failed,
      results: results.map(r => ({
        siteId: r.siteId,
        url: r.url,
        success: r.success,
        score: r.score,
        violations: r.violations,
        error: r.error,
      })),
    })

  } catch (error) {
    console.error('Scheduled scans API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { auth } from '@/auth'
import { requireProFeature } from '@/lib/pro-features'
import { generateScanPDF, validatePDFRequest, estimatePDFGenerationTime } from '@/lib/pdf-generator'

export async function POST(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  console.log('📄 [pdf-api] Starting PDF generation request for scan:', params.scanId)
  
  try {
    // Verify authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get scan with team details for Pro verification
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select(`
        id,
        status,
        total_violations,
        sites!inner (
          id,
          name,
          url,
          team_id,
          teams!inner (
            id,
            name,
            created_by,
            created_at,
            billing_status,
            stripe_customer_id,
            stripe_subscription_id,
            trial_ends_at,
            is_pro
          )
        )
      `)
      .eq('id', params.scanId)
      .single()

    if (scanError || !scan) {
      console.error('📄 [pdf-api] Scan not found:', scanError)
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    // Verify team membership
    const { data: teamMember, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', scan.sites[0].team_id)
      .eq('user_id', session.user.id)
      .single()

    if (memberError || !teamMember) {
      console.error('📄 [pdf-api] Access denied:', memberError)
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check Pro feature access
    const team = scan.sites[0].teams[0]
    try {
      requireProFeature(team, 'PDF_EXPORT')
      console.log('📄 [pdf-api] Pro access verified for team:', team.name)
    } catch (error) {
      console.error('📄 [pdf-api] Pro feature required:', error)
      return NextResponse.json({ 
        error: 'Pro feature required',
        message: 'PDF export requires a Pro plan. Upgrade to access this feature.',
        feature: 'PDF_EXPORT'
      }, { status: 403 })
    }

    // Validate scan status
    if (scan.status !== 'completed') {
      return NextResponse.json({ 
        error: 'Scan not completed',
        message: 'PDF export is only available for completed scans.'
      }, { status: 400 })
    }

    // Validate request parameters
    const validation = validatePDFRequest(params.scanId, scan.sites[0].team_id, session.user.id)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Check for existing recent PDF generation job
    const { data: existingJob } = await supabase
      .from('pdf_generation_jobs')
      .select('id, status, download_url, created_at')
      .eq('scan_id', params.scanId)
      .eq('user_id', session.user.id)
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // If there's a recent completed job, return the existing URL
    if (existingJob && existingJob.status === 'completed' && existingJob.download_url) {
      console.log('📄 [pdf-api] Returning existing PDF:', existingJob.id)
      return NextResponse.json({
        success: true,
        downloadUrl: existingJob.download_url,
        cached: true,
        jobId: existingJob.id
      })
    }

    // Create new PDF generation job
    const { data: job, error: jobError } = await supabase
      .from('pdf_generation_jobs')
      .insert({
        scan_id: params.scanId,
        team_id: scan.sites[0].team_id,
        user_id: session.user.id,
        status: 'processing'
      })
      .select('id')
      .single()

    if (jobError || !job) {
      console.error('📄 [pdf-api] Failed to create job:', jobError)
      return NextResponse.json({ error: 'Failed to create PDF generation job' }, { status: 500 })
    }

    console.log('📄 [pdf-api] Created PDF job:', job.id)

    // Estimate generation time
    const estimatedTime = estimatePDFGenerationTime(scan.total_violations || 0)
    console.log(`📄 [pdf-api] Estimated generation time: ${estimatedTime}ms`)

    // Start PDF generation (non-blocking)
    generateScanPDF({
      scanId: params.scanId,
      teamId: scan.sites[0].team_id,
      userId: session.user.id,
      format: 'A4',
      timeout: 60000 // 1 minute timeout
    }).then(async (result) => {
      // Update job with result
      const updateData = {
        status: result.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(result.success ? {
          file_path: result.filePath,
          download_url: result.downloadUrl,
          file_size: result.fileSize
        } : {
          error_message: result.error
        })
      }

      const { error: updateError } = await supabase
        .from('pdf_generation_jobs')
        .update(updateData)
        .eq('id', job.id)

      if (updateError) {
        console.error('📄 [pdf-api] Failed to update job:', updateError)
      } else {
        console.log(`📄 [pdf-api] ✅ Job ${job.id} ${result.success ? 'completed' : 'failed'}`)
      }
    }).catch((error) => {
      console.error('📄 [pdf-api] PDF generation error:', error)
      // Update job as failed
      supabase
        .from('pdf_generation_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)
        .then(() => console.log('📄 [pdf-api] Job marked as failed'))
    })

    // Return immediate response with job ID for polling
    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'processing',
      estimatedTime,
      message: 'PDF generation started. Use the job ID to check status.'
    }, { status: 202 }) // 202 Accepted

  } catch (error) {
    console.error('📄 [pdf-api] API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to process PDF generation request'
    }, { status: 500 })
  }
}

// GET endpoint to check PDF generation status
export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get job status
    const { data: job, error: jobError } = await supabase
      .from('pdf_generation_jobs')
      .select('id, status, download_url, error_message, created_at, completed_at, file_size')
      .eq('id', jobId)
      .eq('scan_id', params.scanId)
      .eq('user_id', session.user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const response = {
      jobId: job.id,
      status: job.status,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      ...(job.status === 'completed' && {
        downloadUrl: job.download_url,
        fileSize: job.file_size
      }),
      ...(job.status === 'failed' && {
        error: job.error_message
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('📄 [pdf-api] Status check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

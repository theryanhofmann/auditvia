import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient, createAdminDisabledResponse } from '@/app/lib/supabase/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { siteId } = await request.json()

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    }

    // Check for service key in headers (for Edge Function calls)
    const serviceKey = request.headers.get('x-service-key')
    const isServiceCall = serviceKey === process.env.SUPABASE_SERVICE_ROLE_KEY

    // Get Supabase client (use admin for service calls)
    const supabase = isServiceCall 
      ? await getSupabaseClient() // Will use admin client for service calls
      : await getSupabaseClient()
      
    if (!supabase) {
      return createAdminDisabledResponse()
    }

    // Fetch site details
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, url, name, user_id')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Fetch latest completed scan
    const { data: latestScan, error: scanError } = await supabase
      .from('scans')
      .select('id, score, finished_at, status')
      .eq('site_id', siteId)
      .eq('status', 'completed')
      .order('finished_at', { ascending: false })
      .limit(1)
      .single()

    if (scanError && scanError.code !== 'PGRST116') {
      console.error('Error fetching latest scan:', scanError)
      return NextResponse.json({ error: 'Failed to fetch scan data' }, { status: 500 })
    }

    // If no completed scans, still send summary but indicate no scan data
    let issuesCounts = { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 }
    
    if (latestScan) {
      // Fetch issue counts for the latest scan
      const { data: issues, error: issuesError } = await supabase
        .from('issues')
        .select('severity')
        .eq('scan_id', latestScan.id)

      if (issuesError) {
        console.error('Error fetching issues:', issuesError)
        return NextResponse.json({ error: 'Failed to fetch issues data' }, { status: 500 })
      }

      // Count issues by severity
      issuesCounts = issues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1
        acc.total += 1
        return acc
      }, { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 })
    }

    // Prepare email payload
    const emailPayload = {
      site: {
        id: site.id,
        name: site.name || site.url,
        url: site.url
      },
      scan: latestScan ? {
        id: latestScan.id,
        score: latestScan.score,
        finishedAt: latestScan.finished_at,
        status: latestScan.status
      } : null,
      issues: issuesCounts,
      summary: latestScan 
        ? `Latest scan completed with score ${latestScan.score}/100 and ${issuesCounts.total} issues found`
        : 'No completed scans available for this site'
    }

    // Development mode: just log the payload
    if (process.env.NODE_ENV !== 'production') {
      console.log('Email summary', emailPayload)
      return NextResponse.json({ ok: true, dev: true, payload: emailPayload })
    }

    // Production mode: send actual email
    try {
      // Fetch user email for the site owner
      if (!site.user_id) {
        return NextResponse.json({ error: 'Site has no associated user' }, { status: 400 })
      }

      const { data: userData, error: userError } = await supabase
        .auth.admin.getUserById(site.user_id)

      if (userError || !userData.user?.email) {
        console.error('Error fetching user email:', userError)
        return NextResponse.json({ error: 'Failed to fetch user email' }, { status: 500 })
      }

      const userEmail = userData.user.email

      // Configure nodemailer
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })

      // Generate email content
      const siteName = site.name || site.url
      const subject = `Daily Accessibility Summary for ${siteName}`
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            Daily Accessibility Summary
          </h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">
              ${siteName}
            </h3>
            <p style="color: #6b7280; margin: 5px 0;">
              <strong>URL:</strong> <a href="${site.url}" style="color: #3b82f6;">${site.url}</a>
            </p>
          </div>

          ${latestScan ? `
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e40af;">Latest Scan Results</h3>
                             <p style="font-size: 24px; font-weight: bold; color: ${(latestScan.score ?? 0) >= 90 ? '#059669' : (latestScan.score ?? 0) >= 70 ? '#3b82f6' : (latestScan.score ?? 0) >= 50 ? '#d97706' : '#dc2626'};">
                 Score: ${latestScan.score ?? 0}/100
               </p>
               <p style="color: #6b7280;">
                 Completed: ${latestScan.finished_at ? new Date(latestScan.finished_at).toLocaleDateString() : 'Unknown'}
               </p>
              
              <h4 style="color: #374151; margin-bottom: 10px;">Issues Found:</h4>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div style="background: #fee2e2; padding: 10px; border-radius: 6px;">
                  <strong style="color: #dc2626;">Critical:</strong> ${issuesCounts.critical}
                </div>
                <div style="background: #fed7aa; padding: 10px; border-radius: 6px;">
                  <strong style="color: #ea580c;">Serious:</strong> ${issuesCounts.serious}
                </div>
                <div style="background: #fef3c7; padding: 10px; border-radius: 6px;">
                  <strong style="color: #d97706;">Moderate:</strong> ${issuesCounts.moderate}
                </div>
                <div style="background: #e0e7ff; padding: 10px; border-radius: 6px;">
                  <strong style="color: #3730a3;">Minor:</strong> ${issuesCounts.minor}
                </div>
              </div>
              <p style="margin-top: 15px; color: #374151;">
                <strong>Total Issues:</strong> ${issuesCounts.total}
              </p>
            </div>
          ` : `
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">No Recent Scans</h3>
              <p style="color: #6b7280;">
                No completed scans are available for this site yet. Run your first scan to get accessibility insights.
              </p>
            </div>
          `}

          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              This is an automated summary from Auditvia. 
              <a href="${process.env.NEXTAUTH_URL || 'https://auditvia.com'}/dashboard" style="color: #3b82f6;">
                View full dashboard →
              </a>
            </p>
          </div>
        </div>
      `

      const textContent = `
Daily Accessibility Summary for ${siteName}

Website: ${site.url}

${latestScan ? `
 Latest Scan Results:
 - Score: ${latestScan.score ?? 0}/100
 - Completed: ${latestScan.finished_at ? new Date(latestScan.finished_at).toLocaleDateString() : 'Unknown'}

Issues Found:
- Critical: ${issuesCounts.critical}
- Serious: ${issuesCounts.serious}
- Moderate: ${issuesCounts.moderate}
- Minor: ${issuesCounts.minor}
- Total: ${issuesCounts.total}
` : `
No completed scans are available for this site yet.
Run your first scan to get accessibility insights.
`}

View full dashboard: ${process.env.NEXTAUTH_URL || 'https://auditvia.com'}/dashboard
      `

      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: userEmail,
        subject,
        html: htmlContent,
        text: textContent
      })

      console.log(`Daily summary email sent to ${userEmail} for site ${siteName}`)
      
      return NextResponse.json({ ok: true, sentTo: userEmail })

    } catch (emailError) {
      console.error('Error sending email:', emailError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in POST /api/email/daily-summary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
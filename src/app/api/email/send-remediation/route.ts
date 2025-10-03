import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

export const runtime = 'nodejs'

/**
 * POST /api/email/send-remediation
 * Send accessibility fix guide to designer
 * 
 * For development: logs email payload (no external provider required)
 * For production: integrate with SendGrid, Resend, etc.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      toEmail,
      note,
      siteName,
      pageUrl,
      issueShort,
      impactPlain,
      wcagRef,
      founderHowTo,
      developerNotes,
      reportLink,
      teamId,
      scanId,
      issueId
    } = body

    // Validate required fields
    if (!toEmail || !issueShort) {
      return NextResponse.json(
        { error: 'Email and issue description are required' },
        { status: 400 }
      )
    }

    // Email template
    const subject = `Auditvia – Fix for ${pageUrl} — ${issueShort}`
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0 0; opacity: 0.9; }
    .section { background: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 20px; border-radius: 4px; }
    .section h2 { margin-top: 0; font-size: 18px; color: #1e293b; }
    .section p { margin: 10px 0; }
    .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; }
    .steps { counter-reset: step; }
    .step { counter-increment: step; position: relative; padding-left: 40px; margin-bottom: 16px; }
    .step:before { content: counter(step); position: absolute; left: 0; top: 0; width: 28px; height: 28px; background: #2563eb; color: white; border-radius: 50%; display: flex; align-items: center; justify-center; font-weight: bold; font-size: 14px; }
    .developer-notes { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 13px; overflow-x: auto; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 Accessibility Fix Needed</h1>
    <p>You've received a detailed guide from your team via Auditvia</p>
  </div>

  ${note ? `
  <div class="section">
    <h2>📝 Note from Your Team</h2>
    <p>${note}</p>
  </div>
  ` : ''}

  <div class="section">
    <h2>🌐 Site Information</h2>
    <p><strong>Site:</strong> ${siteName || 'Your website'}</p>
    <p><strong>Page:</strong> <a href="${pageUrl}">${pageUrl}</a></p>
    <p><strong>WCAG Standard:</strong> <span class="badge">${wcagRef}</span></p>
  </div>

  <div class="section">
    <h2>❌ Issue Detected</h2>
    <p><strong>${issueShort}</strong></p>
    <p style="color: #64748b;">${impactPlain}</p>
  </div>

  <div class="section">
    <h2>✅ How to Fix (Step-by-Step)</h2>
    <div class="steps">
      ${founderHowTo.split('\n').filter((s: string) => s.trim()).map((step: string) => `
        <div class="step">${step}</div>
      `).join('')}
    </div>
  </div>

  ${developerNotes ? `
  <div class="section">
    <h2>💻 Developer Notes</h2>
    <div class="developer-notes">
      <strong>CSS Selector:</strong><br>
      ${developerNotes}
    </div>
    <p style="margin-top: 12px; font-size: 14px; color: #64748b;">
      This is the specific element that needs to be fixed in your code.
    </p>
  </div>
  ` : ''}

  <div class="section">
    <h2>📊 View Full Report</h2>
    <p>For complete details and more issues, view the full accessibility report:</p>
    <a href="${reportLink}" class="button">Open Full Report →</a>
  </div>

  <div class="footer">
    <p>This email was sent by <strong>Auditvia</strong> – Enterprise Accessibility Platform</p>
    <p>Reply to this email if you have questions or need help.</p>
  </div>
</body>
</html>
    `

    // For development: log the email payload
    console.log('📧 [Email Send - Dev Mode]')
    console.log('Subject:', subject)
    console.log('To:', toEmail)
    console.log('From:', session.user.email)
    console.log('---')
    console.log(htmlBody)
    console.log('---')

    // TODO: In production, integrate with email provider:
    // await sendEmail({
    //   from: 'noreply@auditvia.com',
    //   to: toEmail,
    //   subject,
    //   html: htmlBody
    // })

    // Track analytics (server-side)
    console.log('📊 [Email Analytics]', {
      toEmailDomain: toEmail.split('@')[1],
      issueId,
      teamId,
      scanId,
      userId: session.user.id
    })

    return NextResponse.json({
      success: true,
      message: `Email sent successfully to ${toEmail}`
    })
  } catch (error) {
    console.error('Send remediation email error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}


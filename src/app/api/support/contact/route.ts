import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

/**
 * POST /api/support/contact
 * Handle contact form submissions from AI Engineer handoff
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, topic, message, context } = body

    // Validate required fields
    if (!name || !email || !topic) {
      return NextResponse.json(
        { error: 'Name, email, and topic are required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Log to database (create support_requests table if needed)
    const { error: logError } = await supabase
      .from('support_requests')
      .insert({
        user_id: session.user.id,
        name,
        email,
        topic,
        message: message || '',
        context: context || {},
        status: 'pending',
        created_at: new Date().toISOString()
      })

    if (logError && logError.code !== '42P01') { // Ignore if table doesn't exist
      console.error('Failed to log support request:', logError)
    }

    // Send notification email (integrate with your email provider)
    try {
      await sendSupportNotification({
        name,
        email,
        topic,
        message,
        context,
        userId: session.user.id
      })
    } catch (emailError) {
      console.error('Failed to send support notification:', emailError)
      // Don't fail the request if email fails
    }

    // Track analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('support_contact_submitted', {
        userId: session.user.id,
        topic,
        source: 'ai_engineer_handoff',
        teamId: context?.teamId,
        scanId: context?.scanId
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Support request submitted. We\'ll contact you within 24 hours.'
    })
  } catch (error) {
    console.error('Support contact error:', error)
    return NextResponse.json(
      { error: 'Failed to submit support request' },
      { status: 500 }
    )
  }
}

/**
 * Send support notification email
 * Integrate with your email provider (SendGrid, Resend, etc.)
 */
async function sendSupportNotification(data: {
  name: string
  email: string
  topic: string
  message: string
  context: any
  userId: string
}) {
  const { name, email, topic, message, context } = data

  // TODO: Replace with actual email provider integration
  console.log('📧 [Support Request Notification]', {
    to: process.env.SUPPORT_EMAIL || 'support@auditvia.com',
    subject: `New Support Request: ${topic}`,
    body: `
      Name: ${name}
      Email: ${email}
      Topic: ${topic}
      
      Message:
      ${message}
      
      Context:
      - Team ID: ${context?.teamId || 'N/A'}
      - Scan ID: ${context?.scanId || 'N/A'}
      - Site URL: ${context?.siteUrl || 'N/A'}
      - Verdict: ${context?.verdict || 'N/A'}
      
      User ID: ${data.userId}
    `
  })

  // Example: Send via Resend
  // await resend.emails.send({
  //   from: 'support@auditvia.com',
  //   to: process.env.SUPPORT_EMAIL!,
  //   subject: `New Support Request: ${topic}`,
  //   html: ...
  // })
}


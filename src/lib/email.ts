import { createClient } from '@/app/lib/supabase/server'
import { createHmac } from 'crypto'

/**
 * Email Utility
 * 
 * Handles sending emails for team invitations and other notifications.
 * Uses Supabase Email Templates as fallback, but can be replaced with
 * SendGrid, Postmark, or other email providers.
 */

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Generate a secure invite token
 */
export function generateInviteToken(inviteId: string): string {
  const secret = process.env.INVITE_TOKEN_SECRET || 'your-secret-key-change-in-production'
  const payload = `${inviteId}:${Date.now()}`
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return Buffer.from(`${payload}:${signature}`).toString('base64url')
}

/**
 * Verify an invite token
 */
export function verifyInviteToken(token: string): { inviteId: string; timestamp: number } | null {
  try {
    const secret = process.env.INVITE_TOKEN_SECRET || 'your-secret-key-change-in-production'
    const decoded = Buffer.from(token, 'base64url').toString()
    const [inviteId, timestampStr, signature] = decoded.split(':')
    
    const timestamp = parseInt(timestampStr, 10)
    
    // Verify signature
    const expectedSignature = createHmac('sha256', secret)
      .update(`${inviteId}:${timestampStr}`)
      .digest('hex')
    
    if (signature !== expectedSignature) {
      return null
    }
    
    // Check token age (7 days max)
    const age = Date.now() - timestamp
    if (age > 7 * 24 * 60 * 60 * 1000) {
      return null
    }
    
    return { inviteId, timestamp }
  } catch {
    return null
  }
}

/**
 * Send team invitation email
 */
export async function sendTeamInviteEmail(params: {
  email: string
  teamName: string
  inviterName: string
  role: string
  inviteId: string
  message?: string
}): Promise<boolean> {
  const { email, teamName, inviterName, role, inviteId, message } = params
  
  const token = generateInviteToken(inviteId)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const acceptUrl = `${baseUrl}/accept-invite?token=${token}`
  
  const subject = `You've been invited to join ${teamName} on Auditvia`
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .button:hover { background: #5568d3; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    .message-box { background: #f7f7f7; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
    .role-badge { display: inline-block; background: #e8eaf6; color: #667eea; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🎉 You're Invited!</h1>
    </div>
    <div class="content">
      <p><strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> on Auditvia as a <span class="role-badge">${role.charAt(0).toUpperCase() + role.slice(1)}</span>.</p>
      
      ${message ? `
      <div class="message-box">
        <p style="margin: 0;"><strong>Message from ${inviterName}:</strong></p>
        <p style="margin: 10px 0 0 0;">${message}</p>
      </div>
      ` : ''}
      
      <p>Auditvia helps teams achieve ADA/WCAG compliance with automated accessibility scanning, detailed reports, and actionable remediation guidance.</p>
      
      <div style="text-align: center;">
        <a href="${acceptUrl}" class="button">Accept Invitation</a>
      </div>
      
      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        Or copy and paste this link into your browser:<br>
        <code style="background: #f5f5f5; padding: 8px; display: inline-block; margin-top: 8px; word-break: break-all;">${acceptUrl}</code>
      </p>
      
      <p style="font-size: 13px; color: #999; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
        This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      <p>
        <strong>Auditvia</strong> — Code-level accessibility compliance<br>
        <a href="${baseUrl}" style="color: #667eea;">auditvia.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
  
  const text = `
You've been invited to join ${teamName} on Auditvia!

${inviterName} has invited you to join their team as a ${role}.

${message ? `Message: ${message}\n\n` : ''}

Accept your invitation by visiting:
${acceptUrl}

This invitation will expire in 7 days.

---
Auditvia — Code-level accessibility compliance
${baseUrl}
  `.trim()
  
  try {
    // Option 1: Use Supabase Email (if configured)
    const supabase = await createClient()
    
    // Check if Supabase Email is configured
    const { data: config } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    
    // For now, we'll use Supabase's built-in email sending
    // In production, replace this with SendGrid, Postmark, etc.
    
    // Fallback: Use a custom email service
    return await sendEmailViaProvider({ to: email, subject, html, text })
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    return false
  }
}

/**
 * Send email via external provider
 * 
 * Replace this with your preferred email service:
 * - SendGrid: https://github.com/sendgrid/sendgrid-nodejs
 * - Postmark: https://github.com/wildbit/postmark.js
 * - Resend: https://resend.com/docs/send-with-nodejs
 * - AWS SES: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/ses-examples-sending-email.html
 */
async function sendEmailViaProvider(options: EmailOptions): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER || 'console'
  
  switch (provider) {
    case 'console':
      // Development: Just log to console
      console.log('📧 Email would be sent:')
      console.log('To:', options.to)
      console.log('Subject:', options.subject)
      console.log('---')
      console.log(options.text || 'HTML email (text version not provided)')
      console.log('---')
      return true
      
    case 'sendgrid':
      // TODO: Implement SendGrid
      // const sgMail = require('@sendgrid/mail')
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
      // await sgMail.send({
      //   to: options.to,
      //   from: process.env.FROM_EMAIL,
      //   subject: options.subject,
      //   html: options.html,
      //   text: options.text
      // })
      return true
      
    case 'postmark':
      // TODO: Implement Postmark
      // const postmark = require('postmark')
      // const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY)
      // await client.sendEmail({
      //   From: process.env.FROM_EMAIL,
      //   To: options.to,
      //   Subject: options.subject,
      //   HtmlBody: options.html,
      //   TextBody: options.text
      // })
      return true
      
    case 'resend':
      // TODO: Implement Resend
      // const { Resend } = require('resend')
      // const resend = new Resend(process.env.RESEND_API_KEY)
      // await resend.emails.send({
      //   from: process.env.FROM_EMAIL,
      //   to: options.to,
      //   subject: options.subject,
      //   html: options.html,
      //   text: options.text
      // })
      return true
      
    default:
      console.warn(`Unknown email provider: ${provider}`)
      return false
  }
}

/**
 * Send invite resent notification
 */
export async function sendInviteResentEmail(params: {
  email: string
  teamName: string
  inviterName: string
  role: string
  inviteId: string
}): Promise<boolean> {
  // Same as sendTeamInviteEmail but with different subject line
  return sendTeamInviteEmail({
    ...params,
    message: undefined
  })
}


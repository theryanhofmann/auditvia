import { Resend } from 'resend'
import { render } from '@react-email/render'
import ScanCompletionEmail from '@/app/emails/ScanCompletionEmail'
import { Site, Scan, Issue, EmailUser } from '@/app/types/email'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

interface SendScanCompletionEmailParams {
  user: EmailUser
  site: Site
  scan: Scan
  violations: Issue[]
}

export async function sendScanCompletionEmail({
  user,
  site,
  scan,
  violations,
}: SendScanCompletionEmailParams) {
  // Skip email in development if no RESEND_API_KEY is configured
  if (!resend) {
    console.log('📧 Email sending skipped - no RESEND_API_KEY configured')
    return null
  }

  if (!user.pro || !user.email) {
    return null
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      throw new Error('NEXT_PUBLIC_APP_URL is not defined')
    }

    const html = await render(
      ScanCompletionEmail({
        site,
        scan,
        violations,
        appUrl,
      })
    )

    const text = html.replace(/<[^>]*>/g, '')

    const { data, error } = await resend.emails.send({
      from: 'Auditvia <scans@auditvia.com>',
      to: user.email,
      subject: `Accessibility Scan Results for ${site.url}`,
      html,
      text,
    })

    if (error) {
      console.error('Error sending scan completion email:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error sending scan completion email:', error)
    return null
  }
} 
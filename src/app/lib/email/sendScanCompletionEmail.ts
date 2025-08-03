import { Resend } from 'resend'
import { render } from '@react-email/render'
import ScanCompletionEmail from '@/app/emails/ScanCompletionEmail'
import { Site, Scan, Issue, EmailUser } from '@/app/types/email'

const resend = new Resend(process.env.RESEND_API_KEY)

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
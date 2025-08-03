import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { Site, Scan, Issue, IssueSeverity } from '@/app/types/email'

interface ScanCompletionEmailProps {
  site: Site
  scan: Scan
  violations: Issue[]
  appUrl: string
}

export default function ScanCompletionEmail({
  site,
  scan,
  violations,
  appUrl,
}: ScanCompletionEmailProps) {
  const reportUrl = `${appUrl}/sites/${site.id}/scans/${scan.id}`
  const scoreColor = scan.score >= 90 ? '#22c55e' : scan.score >= 70 ? '#f59e0b' : '#ef4444'
  const totalIssues = violations.length
  const criticalIssues = violations.filter(v => v.severity === 'critical').length
  const seriousIssues = violations.filter(v => v.severity === 'serious').length
  const moderateIssues = violations.filter(v => v.severity === 'moderate').length

  // Get top 3 most severe issues
  const topIssues = violations
    .sort((a, b) => {
      const severityOrder: Record<IssueSeverity, number> = {
        critical: 0,
        serious: 1,
        moderate: 2,
        minor: 3,
      }
      return severityOrder[a.severity as IssueSeverity] - severityOrder[b.severity as IssueSeverity]
    })
    .slice(0, 3)

  return (
    <Html>
      <Head />
      <Preview>Your accessibility scan for {site.url} is complete</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logo}>
            <img
              src={`${appUrl}/logo.png`}
              width="140"
              height="40"
              alt="Auditvia"
              style={{ margin: '0 auto' }}
            />
          </Section>

          <Heading style={heading}>Scan Results for {site.url}</Heading>
          
          <Section style={scoreSection}>
            <div style={scoreCircle}>
              <Text style={scoreText}>{scan.score}</Text>
            </div>
            <Text style={scoreLabel}>Accessibility Score</Text>
          </Section>

          <Section>
            <Text style={summaryText}>
              We found {totalIssues} accessibility {totalIssues === 1 ? 'issue' : 'issues'}:
            </Text>
            <Text style={issueBreakdown}>
              • {criticalIssues} critical
              <br />
              • {seriousIssues} serious
              <br />
              • {moderateIssues} moderate
            </Text>
          </Section>

          {topIssues.length > 0 && (
            <Section>
              <Text style={sectionTitle}>Top Issues to Address:</Text>
              {topIssues.map((issue, i) => (
                <Text key={i} style={issueItem}>
                  <strong style={{ color: scoreColor }}>{issue.severity.toUpperCase()}</strong>
                  <br />
                  {issue.message}
                </Text>
              ))}
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={reportUrl}>
              View Full Report
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            You received this email because you have a Pro subscription with Auditvia.
            <br />
            <Link href={`${appUrl}/settings`} style={link}>
              Manage email preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  padding: '40px 20px',
  maxWidth: '600px',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
}

const logo = {
  marginBottom: '24px',
  textAlign: 'center' as const,
}

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '400',
  color: '#484848',
  padding: '17px 0 0',
  textAlign: 'center' as const,
}

const scoreSection = {
  textAlign: 'center' as const,
  margin: '40px 0',
}

const scoreCircle = {
  width: '120px',
  height: '120px',
  margin: '0 auto',
  borderRadius: '60px',
  backgroundColor: '#f8fafc',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const scoreText = {
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0',
}

const scoreLabel = {
  fontSize: '16px',
  color: '#64748b',
  marginTop: '12px',
}

const summaryText = {
  fontSize: '16px',
  color: '#484848',
  marginBottom: '8px',
}

const issueBreakdown = {
  fontSize: '14px',
  color: '#64748b',
  lineHeight: '24px',
}

const sectionTitle = {
  fontSize: '16px',
  color: '#484848',
  fontWeight: 'bold',
  marginTop: '32px',
  marginBottom: '16px',
}

const issueItem = {
  fontSize: '14px',
  color: '#64748b',
  lineHeight: '24px',
  marginBottom: '12px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 24px',
}

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0 24px',
}

const footer = {
  fontSize: '13px',
  lineHeight: '22px',
  color: '#8898aa',
  textAlign: 'center' as const,
}

const link = {
  color: '#556cd6',
  textDecoration: 'underline',
} 
import { notFound } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { auth } from '@/auth'
import { format } from 'date-fns'
import { CheckCircle, XCircle, AlertTriangle, Info, Crown } from 'lucide-react'

interface PDFReportPageProps {
  params: { scanId: string }
  searchParams: { token?: string }
}

export default async function PDFReportPage({ params, searchParams }: PDFReportPageProps) {
  const supabase = await createClient()
  
  // For PDF generation, we might use a token-based auth or session auth
  const session = await auth()
  const authToken = searchParams.token
  
  // Validate auth token if provided
  let tokenData = null
  if (authToken) {
    try {
      tokenData = JSON.parse(Buffer.from(authToken, 'base64').toString())
      // Check if token is expired
      if (tokenData.exp && Date.now() > tokenData.exp) {
        console.error('🎨 [pdf-template] Auth token expired')
        notFound()
      }
      // Verify token is for this scan
      if (tokenData.scanId !== params.scanId) {
        console.error('🎨 [pdf-template] Token scan ID mismatch')
        notFound()
      }
    } catch (error) {
      console.error('🎨 [pdf-template] Invalid auth token:', error)
      notFound()
    }
  }
  
  // Get scan with all related data
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select(`
      id,
      status,
      started_at,
      finished_at,
      total_violations,
      passes,
      incomplete,
      inapplicable,
      scan_time_ms,
      created_at,
      sites!inner (
        id,
        name,
        url,
        team_id,
        teams!inner (
          id,
          name,
          billing_status,
          is_pro
        )
      ),
      issues (
        id,
        rule,
        selector,
        severity,
        impact,
        description,
        help_url,
        html,
        wcag_criterion
      )
    `)
    .eq('id', params.scanId)
    .single()

  if (scanError || !scan) {
    notFound()
  }

  // Verify access (either authenticated user in team or valid token)
  if (!authToken) {
    // No token provided, check session auth
    if (!session?.user?.id) {
      notFound()
    }
    
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', scan.sites[0].team_id)
      .eq('user_id', session.user.id)
      .single()

    if (!teamMember) {
      notFound()
    }
  } else {
    // Token provided, verify it matches the expected user/team
    if (tokenData && session?.user?.id && tokenData.userId !== session.user.id) {
      console.error('🎨 [pdf-template] Token user ID mismatch')
      notFound()
    }
  }

  const site = scan.sites[0]
  const team = site.teams[0]
  const scanDate = new Date(scan.created_at)
  
  // Calculate score
  const totalTests = scan.passes + scan.total_violations + scan.incomplete + scan.inapplicable
  const successfulTests = scan.passes + scan.inapplicable
  const score = totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0

  // Group issues by severity
  const groupedIssues = scan.issues.reduce((acc: Record<string, any[]>, issue: any) => {
    const severity = issue.severity || 'minor'
    if (!acc[severity]) acc[severity] = []
    acc[severity].push(issue)
    return acc
  }, {})

  const severityOrder = ['critical', 'serious', 'moderate', 'minor']
  const severityColors = {
    critical: 'text-red-600',
    serious: 'text-orange-600', 
    moderate: 'text-yellow-600',
    minor: 'text-gray-600'
  }

  const severityIcons = {
    critical: XCircle,
    serious: AlertTriangle,
    moderate: AlertTriangle,
    minor: Info
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Accessibility Report - {site.name || site.url}</title>
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { margin: 0; }
              .page-break { page-break-before: always; }
              .no-break { page-break-inside: avoid; }
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              background: white;
              margin: 0;
              padding: 20px;
            }
            
            .header {
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            
            .footer {
              position: fixed;
              bottom: 20px;
              left: 20px;
              right: 20px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              border-top: 1px solid #e5e7eb;
              padding-top: 10px;
            }
            
            .score-circle {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 36px;
              font-weight: bold;
              color: white;
              margin: 0 auto 20px;
            }
            
            .score-excellent { background: linear-gradient(135deg, #10b981, #059669); }
            .score-good { background: linear-gradient(135deg, #f59e0b, #d97706); }
            .score-poor { background: linear-gradient(135deg, #ef4444, #dc2626); }
            
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin: 30px 0;
            }
            
            .stat-card {
              text-align: center;
              padding: 20px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background: #f9fafb;
            }
            
            .stat-number {
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            
            .stat-label {
              font-size: 14px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            
            .severity-section {
              margin: 40px 0;
              padding: 20px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
            }
            
            .severity-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 20px;
              font-size: 18px;
              font-weight: 600;
            }
            
            .issue-item {
              margin: 15px 0;
              padding: 15px;
              background: #f9fafb;
              border-left: 4px solid #e5e7eb;
              border-radius: 0 4px 4px 0;
            }
            
            .issue-rule {
              font-weight: 600;
              margin-bottom: 5px;
            }
            
            .issue-description {
              color: #4b5563;
              margin-bottom: 10px;
            }
            
            .issue-selector {
              font-family: 'Monaco', 'Menlo', monospace;
              font-size: 12px;
              background: #f3f4f6;
              padding: 5px 8px;
              border-radius: 4px;
              color: #374151;
            }
            
            .wcag-ref {
              display: inline-block;
              background: #dbeafe;
              color: #1e40af;
              padding: 2px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 500;
              margin-top: 5px;
            }
            
            .pro-badge {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              background: linear-gradient(135deg, #f59e0b, #d97706);
              color: white;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 500;
            }
            
            .summary-box {
              background: #f0f9ff;
              border: 1px solid #bae6fd;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            
            h1 { font-size: 28px; margin: 0 0 10px 0; }
            h2 { font-size: 24px; margin: 30px 0 15px 0; }
            h3 { font-size: 18px; margin: 20px 0 10px 0; }
            
            .text-center { text-align: center; }
            .text-sm { font-size: 14px; }
            .text-xs { font-size: 12px; }
            .mb-4 { margin-bottom: 16px; }
            .mt-4 { margin-top: 16px; }
          `
        }} />
      </head>
      <body>
        {/* Header */}
        <div className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h1>Accessibility Report</h1>
              <p style={{ fontSize: '18px', color: '#6b7280', margin: '5px 0' }}>
                {site.name || new URL(site.url).hostname}
              </p>
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                {site.url}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="pro-badge">
                <Crown style={{ width: '12px', height: '12px' }} />
                Pro Report
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '10px 0 0 0' }}>
                Generated on {format(new Date(), 'PPP')}
              </p>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                Scan completed {format(scanDate, 'PPp')}
              </p>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="summary-box">
          <h2 style={{ margin: '0 0 15px 0', color: '#1e40af' }}>Executive Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '30px', alignItems: 'center' }}>
            <div>
              <div className={`score-circle ${
                score >= 90 ? 'score-excellent' : 
                score >= 70 ? 'score-good' : 'score-poor'
              }`}>
                {score}
              </div>
              <p className="text-center text-sm">Accessibility Score</p>
            </div>
            <div>
              <p style={{ fontSize: '16px', marginBottom: '15px' }}>
                This accessibility audit found <strong>{scan.total_violations} violations</strong> across{' '}
                <strong>{totalTests} total tests</strong> on {site.name || site.url}.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <div>
                  <strong>Critical Issues:</strong> {groupedIssues.critical?.length || 0}
                </div>
                <div>
                  <strong>Serious Issues:</strong> {groupedIssues.serious?.length || 0}
                </div>
                <div>
                  <strong>Moderate Issues:</strong> {groupedIssues.moderate?.length || 0}
                </div>
                <div>
                  <strong>Minor Issues:</strong> {groupedIssues.minor?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#ef4444' }}>
              {scan.total_violations}
            </div>
            <div className="stat-label">Violations</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#10b981' }}>
              {scan.passes}
            </div>
            <div className="stat-label">Passes</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#f59e0b' }}>
              {scan.incomplete}
            </div>
            <div className="stat-label">Incomplete</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#6b7280' }}>
              {scan.inapplicable}
            </div>
            <div className="stat-label">Inapplicable</div>
          </div>
        </div>

        {/* Issues by Severity */}
        {severityOrder.map(severity => {
          const issues = groupedIssues[severity]
          if (!issues || issues.length === 0) return null
          
          const SeverityIcon = severityIcons[severity as keyof typeof severityIcons]
          
          return (
            <div key={severity} className="severity-section no-break">
              <div className="severity-header">
                <SeverityIcon style={{ width: '20px', height: '20px' }} />
                <span className={severityColors[severity as keyof typeof severityColors]}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)} Issues ({issues.length})
                </span>
              </div>
              
              {issues.slice(0, 10).map((issue: any, index: number) => (
                <div key={issue.id} className="issue-item">
                  <div className="issue-rule">{issue.rule}</div>
                  <div className="issue-description">{issue.description}</div>
                  {issue.selector && (
                    <div className="issue-selector">{issue.selector}</div>
                  )}
                  {issue.wcag_criterion && (
                    <div className="wcag-ref">WCAG {issue.wcag_criterion}</div>
                  )}
                </div>
              ))}
              
              {issues.length > 10 && (
                <p style={{ textAlign: 'center', color: '#6b7280', fontStyle: 'italic', margin: '20px 0' }}>
                  ... and {issues.length - 10} more {severity} issues
                </p>
              )}
            </div>
          )
        })}

        {/* Scan Details */}
        <div style={{ marginTop: '40px', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
          <h3>Scan Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <div><strong>Scan ID:</strong> {scan.id}</div>
            <div><strong>Team:</strong> {team.name}</div>
            <div><strong>Started:</strong> {format(new Date(scan.started_at), 'PPp')}</div>
            <div><strong>Completed:</strong> {format(new Date(scan.finished_at || scan.created_at), 'PPp')}</div>
            <div><strong>Duration:</strong> {scan.scan_time_ms ? `${(scan.scan_time_ms / 1000).toFixed(1)}s` : 'N/A'}</div>
            <div><strong>Status:</strong> {scan.status}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <p>
            Generated by Auditvia • {format(new Date(), 'PPP')} • Page 1 of 1 • 
            Accessibility Report for {site.name || new URL(site.url).hostname}
          </p>
        </div>
      </body>
    </html>
  )
}

import { format } from 'date-fns'
import {  XCircle, AlertTriangle, Info, Crown } from 'lucide-react'

// Sample data for demonstration
const sampleScan = {
  id: 'sample-scan-123',
  status: 'completed',
  started_at: '2024-01-15T10:00:00Z',
  finished_at: '2024-01-15T10:02:30Z',
  total_violations: 12,
  passes: 45,
  incomplete: 3,
  inapplicable: 8,
  scan_time_ms: 150000,
  created_at: '2024-01-15T10:00:00Z',
  sites: [{
    id: 'site-123',
    name: 'Accessibe Demo Site',
    url: 'https://accessibe.com',
    team_id: 'team-123',
    teams: [{
      id: 'team-123',
      name: 'Demo Team',
      billing_status: 'pro' as const,
      is_pro: true
    }]
  }],
  issues: [
    {
      id: 'issue-1',
      rule: 'color-contrast',
      selector: '.hero-text',
      severity: 'serious',
      impact: 'serious',
      description: 'Elements must have sufficient color contrast',
      help_url: 'https://dequeuniversity.com/rules/axe/4.4/color-contrast',
      html: '<p class="hero-text">Welcome to our site</p>',
      wcag_criterion: '1.4.3'
    },
    {
      id: 'issue-2', 
      rule: 'image-alt',
      selector: 'img[src="hero.jpg"]',
      severity: 'critical',
      impact: 'critical',
      description: 'Images must have alternate text',
      help_url: 'https://dequeuniversity.com/rules/axe/4.4/image-alt',
      html: '<img src="hero.jpg">',
      wcag_criterion: '1.1.1'
    },
    {
      id: 'issue-3',
      rule: 'heading-order',
      selector: 'h3.section-title',
      severity: 'moderate',
      impact: 'moderate', 
      description: 'Heading levels should only increase by one',
      help_url: 'https://dequeuniversity.com/rules/axe/4.4/heading-order',
      html: '<h3 class="section-title">Features</h3>',
      wcag_criterion: '1.3.1'
    },
    {
      id: 'issue-4',
      rule: 'link-name',
      selector: 'a.read-more',
      severity: 'serious',
      impact: 'serious',
      description: 'Links must have discernible text',
      help_url: 'https://dequeuniversity.com/rules/axe/4.4/link-name',
      html: '<a href="/more" class="read-more">Read more</a>',
      wcag_criterion: '2.4.4'
    }
  ]
}

export default function SamplePDFReportPage() {
  const site = sampleScan.sites[0]
  const team = site.teams[0]
  const scanDate = new Date(sampleScan.created_at)
  
  // Calculate score
  const totalTests = sampleScan.passes + sampleScan.total_violations + sampleScan.incomplete + sampleScan.inapplicable
  const successfulTests = sampleScan.passes + sampleScan.inapplicable
  const score = totalTests > 0 ? Math.round((successfulTests / totalTests) * 100) : 0

  // Group issues by severity
  const groupedIssues = sampleScan.issues.reduce((acc: Record<string, any[]>, issue: any) => {
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
        <title>Accessibility Report - {site.name}</title>
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
                {site.name}
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
                This accessibility audit found <strong>{sampleScan.total_violations} violations</strong> across{' '}
                <strong>{totalTests} total tests</strong> on {site.name}.
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
              {sampleScan.total_violations}
            </div>
            <div className="stat-label">Violations</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#10b981' }}>
              {sampleScan.passes}
            </div>
            <div className="stat-label">Passes</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#f59e0b' }}>
              {sampleScan.incomplete}
            </div>
            <div className="stat-label">Incomplete</div>
          </div>
          <div className="stat-card">
            <div className="stat-number" style={{ color: '#6b7280' }}>
              {sampleScan.inapplicable}
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
              
              {issues.map((issue: any) => (
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
            </div>
          )
        })}

        {/* Scan Details */}
        <div style={{ marginTop: '40px', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
          <h3>Scan Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
            <div><strong>Scan ID:</strong> {sampleScan.id}</div>
            <div><strong>Team:</strong> {team.name}</div>
            <div><strong>Started:</strong> {format(new Date(sampleScan.started_at), 'PPp')}</div>
            <div><strong>Completed:</strong> {format(new Date(sampleScan.finished_at || sampleScan.created_at), 'PPp')}</div>
            <div><strong>Duration:</strong> {sampleScan.scan_time_ms ? `${(sampleScan.scan_time_ms / 1000).toFixed(1)}s` : 'N/A'}</div>
            <div><strong>Status:</strong> {sampleScan.status}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <p>
            Generated by Auditvia • {format(new Date(), 'PPP')} • Page 1 of 1 • 
            Accessibility Report for {site.name}
          </p>
        </div>
      </body>
    </html>
  )
}

/**
 * Export scan reports to Markdown and CSV formats
 * Single-scan exports for completed reports with issues
 */

interface ExportIssue {
  id: string
  rule: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help_url: string | null
  selector: string
  html: string | null
}

interface ExportMetadata {
  scanId: string
  siteName: string
  siteUrl: string
  scanDate: string
  score: number
  totalViolations: number
  passes: number
  incomplete: number
  inapplicable: number
}

/**
 * Generate filename slug from site name
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 50) // Limit length for filename safety
}

/**
 * Truncate text to max length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Sanitize HTML for export (single line, trimmed)
 */
function sanitizeHtml(html: string | null): string {
  if (!html) return ''
  return html
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 500) // Limit to 500 chars
}

/**
 * Format date for display (ISO + local)
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  const iso = date.toISOString()
  const local = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })
  return `${iso} (${local})`
}

/**
 * Generate Markdown export
 */
export function generateMarkdownExport(
  issues: ExportIssue[],
  metadata: ExportMetadata,
  truncated: boolean = false
): string {
  const lines: string[] = []
  
  // Header
  lines.push(`# Accessibility Scan Report`)
  lines.push('')
  lines.push(`**Site:** ${metadata.siteName}`)
  lines.push(`**URL:** ${metadata.siteUrl}`)
  lines.push(`**Scan Date:** ${formatDate(metadata.scanDate)}`)
  lines.push(`**Scan ID:** \`${metadata.scanId}\``)
  lines.push('')
  lines.push(`## Summary`)
  lines.push('')
  lines.push(`- **Score:** ${metadata.score}%`)
  lines.push(`- **Violations:** ${metadata.totalViolations}`)
  lines.push(`- **Passes:** ${metadata.passes}`)
  lines.push(`- **Incomplete:** ${metadata.incomplete}`)
  lines.push(`- **Inapplicable:** ${metadata.inapplicable}`)
  lines.push('')
  
  if (truncated) {
    lines.push('> **Note:** Results truncated to first 2,000 items for export.')
    lines.push('')
  }
  
  lines.push(`---`)
  lines.push('')
  
  if (issues.length === 0) {
    lines.push(`## No Violations Found`)
    lines.push('')
    lines.push(`✅ This scan found no accessibility violations. Great work!`)
  } else {
    lines.push(`## Violations (${issues.length})`)
    lines.push('')
    
    // Group by impact
    const grouped = {
      critical: issues.filter(i => i.impact === 'critical'),
      serious: issues.filter(i => i.impact === 'serious'),
      moderate: issues.filter(i => i.impact === 'moderate'),
      minor: issues.filter(i => i.impact === 'minor')
    }
    
    let issueNum = 1
    
    for (const [impact, impactIssues] of Object.entries(grouped)) {
      if (impactIssues.length === 0) continue
      
      lines.push(`### ${impact.charAt(0).toUpperCase() + impact.slice(1)} Issues (${impactIssues.length})`)
      lines.push('')
      
      for (const issue of impactIssues) {
        lines.push(`#### ${issueNum}. ${issue.rule}`)
        lines.push('')
        lines.push(`**Impact:** ${issue.impact}`)
        lines.push('')
        lines.push(`**Description:** ${issue.description}`)
        lines.push('')
        
        if (issue.selector) {
          lines.push(`**Selector:**`)
          lines.push('```css')
          lines.push(truncate(issue.selector, 200))
          lines.push('```')
          lines.push('')
        }
        
        if (issue.html) {
          lines.push(`**HTML:**`)
          lines.push('```html')
          lines.push(sanitizeHtml(issue.html))
          lines.push('```')
          lines.push('')
        }
        
        if (issue.help_url) {
          lines.push(`**Learn More:** ${issue.help_url}`)
          lines.push('')
        }
        
        lines.push(`---`)
        lines.push('')
        issueNum++
      }
    }
  }
  
  // Footer
  lines.push(`## Export Information`)
  lines.push('')
  lines.push(`- **Generated:** ${new Date().toISOString()}`)
  lines.push(`- **Source:** Auditvia`)
  lines.push(`- **Environment:** ${process.env.NODE_ENV || 'development'}`)
  lines.push('')
  
  return lines.join('\n')
}

/**
 * Escape CSV field
 */
function escapeCsv(field: string | null | undefined): string {
  if (!field) return ''
  const str = String(field)
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Generate CSV export
 */
export function generateCsvExport(
  issues: ExportIssue[],
  metadata: ExportMetadata,
  truncated: boolean = false
): string {
  const lines: string[] = []
  
  // Metadata header (as comments, not valid CSV but informative)
  lines.push(`# Accessibility Scan Report`)
  lines.push(`# Site: ${metadata.siteName}`)
  lines.push(`# URL: ${metadata.siteUrl}`)
  lines.push(`# Scan Date: ${formatDate(metadata.scanDate)}`)
  lines.push(`# Scan ID: ${metadata.scanId}`)
  lines.push(`# Score: ${metadata.score}%`)
  lines.push(`# Violations: ${metadata.totalViolations}, Passes: ${metadata.passes}, Incomplete: ${metadata.incomplete}, Inapplicable: ${metadata.inapplicable}`)
  if (truncated) {
    lines.push(`# Note: Truncated to first 2,000 results`)
  }
  lines.push(`# Generated: ${new Date().toISOString()}`)
  lines.push(``)
  
  // CSV Header
  lines.push([
    'Issue ID',
    'Rule',
    'Impact',
    'Description',
    'Selector',
    'HTML',
    'Help URL'
  ].map(escapeCsv).join(','))
  
  // Data rows
  if (issues.length === 0) {
    // Empty export with just headers
    lines.push(`# No violations found`)
  } else {
    for (const issue of issues) {
      lines.push([
        issue.id,
        issue.rule,
        issue.impact,
        issue.description,
        truncate(issue.selector, 200),
        sanitizeHtml(issue.html),
        issue.help_url || ''
      ].map(escapeCsv).join(','))
    }
  }
  
  return lines.join('\n')
}

/**
 * Generate export filename
 */
export function generateExportFilename(
  siteName: string,
  scanId: string,
  format: 'md' | 'csv'
): string {
  const slug = slugify(siteName)
  const shortScanId = scanId.substring(0, 8)
  return `auditvia-report-${slug}-${shortScanId}.${format}`
}

/**
 * Get MIME type for format
 */
export function getExportMimeType(format: 'md' | 'csv'): string {
  switch (format) {
    case 'md':
      return 'text/markdown;charset=utf-8'
    case 'csv':
      return 'text/csv;charset=utf-8'
  }
}

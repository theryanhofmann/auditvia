import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'
import { Navigation } from '@/app/components/Navigation'

// Mock data for demonstration
const mockSites = [
  {
    id: '1',
    name: 'Example Website',
    url: 'https://example.com',
  },
]

const mockAuditResults = [
  {
    id: '1',
    site_id: '1',
    score: 85,
    violations: [
      {
        id: 'color-contrast',
        impact: 'serious',
        description: 'Elements must have sufficient color contrast',
        nodes: [
          {
            target: ['.button-primary'],
            html: '<button class="button-primary">Click me</button>',
            failureSummary: 'Fix any of the following:\n  Element has insufficient color contrast of 3.2:1 (foreground color: #ffffff, background color: #4a90e2, font size: 14.0pt (18.6667px), font weight: normal). Expected contrast ratio of 4.5:1'
          }
        ]
      }
    ],
    created_at: '2024-01-15T10:30:00Z',
  },
]

interface PageProps {
  params: Promise<{
    siteId: string
    scanId: string
  }>
}

export default async function SiteReportPage({ params }: PageProps) {
  const { siteId, scanId } = await params
  
  // In a real app, fetch from database
  const site = mockSites.find(s => s.id === siteId)
  const auditResult = mockAuditResults.find(r => r.id === scanId && r.site_id === siteId)
  
  if (!site || !auditResult) {
    notFound()
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-50 dark:bg-green-900/20'
    if (score >= 70) return 'bg-blue-50 dark:bg-blue-900/20'
    if (score >= 50) return 'bg-yellow-50 dark:bg-yellow-900/20'
    return 'bg-red-50 dark:bg-red-900/20'
  }

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'serious':
        return <AlertCircle className="w-5 h-5 text-orange-500" />
      case 'moderate':
        return <Info className="w-5 h-5 text-yellow-500" />
      case 'minor':
        return <CheckCircle className="w-5 h-5 text-blue-500" />
      default:
        return <Info className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Accessibility Report
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {site.name} • {format(new Date(auditResult.created_at), 'MMMM dd, yyyy')}
              </p>
            </div>
            
            <div className={`px-6 py-3 rounded-lg ${getScoreBg(auditResult.score)}`}>
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(auditResult.score)}`}>
                  {auditResult.score}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Accessibility Score
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Scan Summary
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {auditResult.violations.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Issues Found
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {auditResult.violations.reduce((acc, v) => acc + v.nodes.length, 0)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Elements Affected
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(auditResult.score)}`}>
                {auditResult.score >= 90 ? 'Excellent' : 
                 auditResult.score >= 70 ? 'Good' : 
                 auditResult.score >= 50 ? 'Needs Work' : 'Poor'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Overall Rating
              </div>
            </div>
          </div>
        </div>

        {/* Violations */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Accessibility Issues
          </h2>
          
          {auditResult.violations.map((violation, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start space-x-3">
                {getImpactIcon(violation.impact)}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {violation.description}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <span className="font-medium">Impact:</span> {violation.impact} • 
                    <span className="font-medium ml-2">Affected elements:</span> {violation.nodes.length}
                  </div>
                  
                  <div className="space-y-4">
                    {violation.nodes.map((node, nodeIndex) => (
                      <div key={nodeIndex} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Element:
                          </span>
                          <code className="ml-2 text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {node.target.join(', ')}
                          </code>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            HTML:
                          </span>
                          <pre className="mt-1 text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                            <code>{node.html}</code>
                          </pre>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            How to fix:
                          </span>
                          <pre className="mt-1 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {node.failureSummary}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
} 
'use client'

import { useState, useEffect } from 'react'
import { ReportTopBanner } from '@/app/components/report/ReportTopBanner'
import { CategoryCard } from '@/app/components/report/CategoryCard'
import { IssueDetailPanel } from '@/app/components/report/IssueDetailPanel'
import { AiEngineer } from '@/app/components/ai/AiEngineer'
import { calculateVerdict, categorizeIssues, CategoryScore } from '@/lib/verdict-system'
import { ExportDropdown } from '@/app/components/ui/ExportDropdown'
import { ExportRemediationButton } from '@/app/components/ui/ExportRemediationButton'
import { CreateTicketsButton } from '@/app/components/ui/CreateTicketsButton'
import { AutoFixFlow } from '@/app/components/integrations/AutoFixFlow'
import { Info } from 'lucide-react'

interface EnterpriseReportClientProps {
  scan: {
    id: string
    created_at: string
    platform?: string
    platform_confidence?: number
    platform_detected_from?: string
    pages_scanned?: number
    states_tested?: number
    violations_count?: number
    advisories_count?: number
    scan_profile?: 'quick' | 'standard' | 'deep'
  }
  site: {
    id: string
    name: string
    url: string
    team_id: string
    monitoring_enabled: boolean
  }
  issues: any[]
  score: number | null
}

export function EnterpriseReportClient({
  scan,
  site,
  issues,
  score
}: EnterpriseReportClientProps) {
  console.log('🎨 [EnterpriseReportClient] RENDERING with data:', {
    scanId: scan.id,
    siteId: site.id,
    siteName: site.name,
    issueCount: issues.length,
    score
  })

  const [selectedIssue, setSelectedIssue] = useState<any>(null)
  const [experienceMode, setExperienceMode] = useState<'founder' | 'developer'>('founder')
  const [showAdvisories, setShowAdvisories] = useState(false)

  // Load experience mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('auditvia:experienceMode')
    if (savedMode === 'founder' || savedMode === 'developer') {
      setExperienceMode(savedMode)
    }
  }, [])

  // Save experience mode to localStorage and track analytics
  const handleModeChange = (mode: 'founder' | 'developer') => {
    setExperienceMode(mode)
    localStorage.setItem('auditvia:experienceMode', mode)
    
    // Track mode change
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('experience_mode_changed', {
        teamId: site.team_id,
        scanId: scan.id,
        newMode: mode,
        previousMode: experienceMode
      })
    }
    console.log('🎯 [Mode Change]', { from: experienceMode, to: mode })
  }

  // Handle issue click with analytics
  const handleIssueClick = (issue: any) => {
    setSelectedIssue(issue)
    
    // Track issue opened
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('issue_opened', {
        teamId: site.team_id,
        scanId: scan.id,
        issueId: issue.id,
        impact: issue.impact,
        rule: issue.rule,
        mode: experienceMode
      })
    }
    console.log('📋 [Issue Opened]', { issueId: issue.id, impact: issue.impact, mode: experienceMode })
  }

  // Filter issues based on advisory toggle
  const filteredIssues = showAdvisories 
    ? issues 
    : issues.filter(issue => issue.tier !== 'advisory')
  
  // Count issues by tier
  const violationsCount = issues.filter(i => i.tier !== 'advisory').length
  const advisoriesCount = issues.filter(i => i.tier === 'advisory').length
  
  // Count issues by severity (for verdict calculation)
  const criticalCount = filteredIssues.filter(i => i.impact === 'critical').length
  const seriousCount = filteredIssues.filter(i => i.impact === 'serious').length
  const moderateCount = filteredIssues.filter(i => i.impact === 'moderate').length
  const minorCount = filteredIssues.filter(i => i.impact === 'minor').length

  // Calculate verdict using the verdict system (only on violations, not advisories)
  const verdict = calculateVerdict(
    issues.filter(i => i.tier !== 'advisory' && i.impact === 'critical').length,
    issues.filter(i => i.tier !== 'advisory' && i.impact === 'serious').length,
    issues.filter(i => i.tier !== 'advisory' && i.impact === 'moderate').length,
    issues.filter(i => i.tier !== 'advisory' && i.impact === 'minor').length
  )

  // Categorize filtered issues
  const categories = categorizeIssues(filteredIssues)

  console.log('🎨 [EnterpriseReportClient] Verdict calculated:', {
    status: verdict.status,
    title: verdict.title,
    riskLevel: verdict.riskLevel
  })
  console.log('🎨 [EnterpriseReportClient] Categories:', categories.map((c: CategoryScore) => ({
    name: c.displayName,
    issueCount: c.issueCount,
    criticalCount: c.criticalCount
  })))

  // Track page view (legacy and v2)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).analytics) {
      // Legacy event for backward compatibility
      (window as any).analytics.track('report_viewed', {
        teamId: site.team_id,
        scanId: scan.id,
        verdict: verdict.status,
        mode: experienceMode,
        totalIssues: issues.length,
        criticalCount,
        seriousCount
      });
      
      // New v2 event with full verdict data
      (window as any).analytics.track('report_viewed_v2', {
        teamId: site.team_id,
        scanId: scan.id,
        siteId: site.id,
        siteName: site.name,
        verdict: verdict.status,
        verdictTitle: verdict.title,
        riskLevel: verdict.riskLevel,
        critical: criticalCount,
        serious: seriousCount,
        moderate: moderateCount,
        minor: minorCount,
        totalIssues: issues.length,
        mode: experienceMode,
        categoriesCount: categories.length
      })
    }
  }, [scan.id, site.team_id, site.id, site.name, verdict.status, verdict.title, verdict.riskLevel, experienceMode, issues.length, criticalCount, seriousCount, moderateCount, minorCount, categories.length])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800" data-testid="report-container">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <a href="/dashboard/sites" className="text-gray-500 hover:text-gray-700 transition-colors">
              Sites
            </a>
            <span className="text-gray-300">/</span>
            <a href={`/dashboard/sites/${site.id}/history?teamId=${site.team_id}`} className="text-gray-500 hover:text-gray-700 transition-colors">
              {site.name}
            </a>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium">Scan Report</span>
          </nav>
        </div>
      </div>

      {/* Deep Scan Summary Strip */}
      {(scan.pages_scanned || scan.states_tested || violationsCount > 0 || advisoriesCount > 0) && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-6 text-sm">
              {scan.pages_scanned && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{scan.pages_scanned}</span>
                  <span className="text-gray-600">
                    {scan.pages_scanned === 1 ? 'Page' : 'Pages'} Scanned
                  </span>
                </div>
              )}
              
              {scan.states_tested && (
                <>
                  <div className="w-px h-4 bg-gray-300" />
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{scan.states_tested}</span>
                    <span className="text-gray-600">
                      {scan.states_tested === 1 ? 'State' : 'States'} Tested
                    </span>
                  </div>
                </>
              )}
              
              <div className="w-px h-4 bg-gray-300" />
              
              <div className="flex items-center gap-2">
                <span className="font-semibold text-red-600">{violationsCount}</span>
                <span className="text-gray-600">Required</span>
              </div>
              
              {advisoriesCount > 0 && (
                <>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600">{advisoriesCount}</span>
                    <span className="text-gray-600">Best Practices</span>
                  </div>
                </>
              )}
              
              {scan.scan_profile && (
                <>
                  <div className="w-px h-4 bg-gray-300 ml-auto" />
                  <div className="text-xs text-gray-500 uppercase tracking-wide">
                    {scan.scan_profile} Scan
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Banner - Hero Verdict */}
      <ReportTopBanner
        verdict={verdict}
        siteName={site.name}
        siteUrl={site.url}
        totalIssues={issues.length}
        criticalCount={criticalCount}
        seriousCount={seriousCount}
        moderateCount={moderateCount}
        minorCount={minorCount}
        scanDate={scan.created_at}
        platform={scan.platform}
        platformConfidence={scan.platform_confidence}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Toolbar - Actions & Mode Switcher */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Accessibility Issues</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Review and address {filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'}
              {!showAdvisories && advisoriesCount > 0 && (
                <span className="text-gray-500"> ({advisoriesCount} best {advisoriesCount === 1 ? 'practice' : 'practices'} hidden)</span>
              )}
            </p>
          </div>
          
          {/* Mode Switcher + Actions */}
          <div className="flex items-center gap-4">
            {/* Founder/Developer Mode Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">View Mode</span>
              <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange('founder')}
                  className={`
                    px-4 py-1.5 rounded-md text-sm font-medium transition-all
                    ${experienceMode === 'founder'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
                  `}
                  data-testid="mode-toggle-founder"
                >
                  Founder
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('developer')}
                  className={`
                    px-4 py-1.5 rounded-md text-sm font-medium transition-all
                    ${experienceMode === 'developer'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
                  `}
                  data-testid="mode-toggle-developer"
                >
                  Developer
                </button>
              </div>
            </div>

            {/* Advisory Toggle */}
            {advisoriesCount > 0 && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAdvisories}
                    onChange={(e) => setShowAdvisories(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Show Best Practices</span>
                </label>
                <div className="relative group">
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                    <p className="font-semibold mb-1">Required vs Best Practices</p>
                    <p className="mb-2">
                      <strong>Required Issues</strong> are WCAG 2.2 / ADA failures that affect your compliance score and legal risk.
                    </p>
                    <p>
                      <strong>Best Practices</strong> are recommendations that improve usability but aren't legally required. 
                      Your compliance score is based on required issues only.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Export Actions */}
            <div className="flex items-center gap-3">
              {/* Create Tickets */}
              {issues.length > 0 && (
                <CreateTicketsButton
                  scanId={scan.id}
                  teamId={site.team_id}
                  issues={issues}
                />
              )}

              {/* Scan Export (MD/CSV) */}
              <ExportDropdown
                scanId={scan.id}
                hasIssues={issues.length > 0}
                disabled={false}
              />

              {/* Remediation Guide */}
              {issues.length > 0 && (
                <ExportRemediationButton
                  issues={issues}
                  scanId={scan.id}
                  siteUrl={site.url}
                  siteName={site.name}
                  scanDate={scan.created_at}
                  score={score ?? 0}
                  variant="outline"
                  size="md"
                />
              )}
            </div>
          </div>
        </div>

        {/* Auto-Fix Flow (Founder mode only) */}
        {experienceMode === 'founder' && issues.length > 0 && scan.platform && (
          <div className="mb-8">
            <AutoFixFlow
              scanId={scan.id}
              teamId={site.team_id}
              siteId={site.id}
              siteName={site.name}
              platform={scan.platform}
              onRescanTriggered={() => {
                // Reload the page to show new scan results
                window.location.reload()
              }}
            />
          </div>
        )}

        {/* Category Cards */}
        {categories.length > 0 ? (
          <div className="space-y-6" data-category-grid>
            {categories.map((category: CategoryScore) => {
              // Get issues for this category
              const categoryIssues = issues.filter(issue => {
                const ruleId = issue.rule_id || issue.id || ''
                return getCategoryForIssue(ruleId) === category.category
              })

              return (
                <CategoryCard
                  key={category.category}
                  category={category.category}
                  displayName={category.displayName}
                  score={category.score}
                  issueCount={category.issueCount}
                  criticalCount={category.criticalCount}
                  humanImpact={category.humanImpact}
                  issues={categoryIssues}
                  onIssueClick={handleIssueClick}
                />
              )
            })}
          </div>
        ) : (
          /* Perfect Score - No Issues */
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-12 text-center">
            <div className="w-16 h-16 rounded-xl bg-white border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <svg 
                className="w-8 h-8 text-emerald-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-emerald-900 mb-2">Perfect Accessibility Score</h3>
            <p className="text-emerald-800 mb-6 max-w-lg mx-auto">
              No accessibility issues detected. Your website meets WCAG 2.2 Level AA standards.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 rounded-lg text-sm font-medium text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Fully Compliant</span>
            </div>
          </div>
        )}
      </div>

      {/* Issue Detail Panel - Mode follows global setting */}
      <IssueDetailPanel
        issue={selectedIssue}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        onOpenAI={(prefillData: any) => {
          // Open AI Engineer with prefilled data
          console.log('🤖 [Open AI with prefill]', prefillData)
          // TODO: Trigger AI Engineer panel with prefilled message
        }}
        mode={experienceMode}
        teamId={site.team_id}
        scanId={scan.id}
        siteUrl={site.url}
        siteName={site.name}
        platform={scan.platform}
      />

      {/* AI Engineer Assistant - Auto-open for at-risk/non-compliant */}
      <AiEngineer
        scanId={scan.id}
        teamId={site.team_id}
        siteUrl={site.url}
        siteName={site.name}
        verdict={verdict.status}
        categories={categories}
        topIssues={issues.slice(0, 10)}
        autoOpen={verdict.status !== 'compliant'}
        mode={experienceMode}
        platform={scan.platform}
        platformConfidence={scan.platform_confidence}
      />
    </div>
  )
}

// Helper function to determine category for an issue
function getCategoryForIssue(ruleId: string): string {
  // Ensure ruleId is always a string
  const safeRuleId = String(ruleId || '').toLowerCase()
  
  if (safeRuleId.includes('button') || safeRuleId.includes('link') || safeRuleId.includes('aria-allowed-role')) {
    return 'clickables'
  }
  if (safeRuleId.includes('heading') || safeRuleId.includes('page-has-heading') || safeRuleId.includes('h1')) {
    return 'titles'
  }
  if (safeRuleId.includes('menu') || safeRuleId.includes('navigation') || safeRuleId.includes('landmark')) {
    return 'menus'
  }
  if (safeRuleId.includes('image') || safeRuleId.includes('alt') || safeRuleId.includes('img')) {
    return 'graphics'
  }
  if (safeRuleId.includes('contrast') || safeRuleId.includes('color')) {
    return 'contrast'
  }
  if (safeRuleId.includes('carousel') || safeRuleId.includes('slider') || safeRuleId.includes('region')) {
    return 'carousels'
  }
  if (safeRuleId.includes('table') || safeRuleId.includes('th') || safeRuleId.includes('td')) {
    return 'tables'
  }
  return 'general'
}


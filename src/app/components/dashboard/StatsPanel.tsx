import { Site } from '@/app/types/dashboard'
import { StatsCard } from './StatsCard'
import { AuditFrequencyChart } from './AuditFrequencyChart'

interface StatsPanelProps {
  sites: Site[]
}

export function StatsPanel({ sites }: StatsPanelProps) {
  // Calculate statistics
  const totalSites = sites.length
  const averageScore = totalSites > 0 
    ? Math.round(sites.reduce((acc, site) => acc + (site.score || 0), 0) / totalSites)
    : 0

  const scoresWithValues = sites.filter(site => site.score !== null && site.score !== undefined)
  const bestScore = scoresWithValues.length > 0 
    ? Math.max(...scoresWithValues.map(site => site.score!))
    : 0
  const worstScore = scoresWithValues.length > 0 
    ? Math.min(...scoresWithValues.map(site => site.score!))
    : 0

  const totalAudits = sites.filter(site => site.last_scan).length
  const auditsThisMonth = sites.filter(site => {
    if (!site.last_scan) return false
    const lastScan = new Date(site.last_scan)
    const now = new Date()
    return lastScan.getMonth() === now.getMonth() && lastScan.getFullYear() === now.getFullYear()
  }).length

  // Calculate trend (simple implementation)
  const previousMonthAudits = sites.filter(site => {
    if (!site.last_scan) return false
    const lastScan = new Date(site.last_scan)
    const now = new Date()
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return lastScan.getMonth() === previousMonth.getMonth() && lastScan.getFullYear() === previousMonth.getFullYear()
  }).length

  const auditTrend = previousMonthAudits > 0 
    ? ((auditsThisMonth - previousMonthAudits) / previousMonthAudits) * 100
    : auditsThisMonth > 0 ? 100 : 0

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Websites"
          value={totalSites}
          trend={totalSites > 0 ? 'up' : 'neutral'}
          trendValue={totalSites > 0 ? '+' + totalSites : '0'}
          description="Websites being monitored"
        />
        
        <StatsCard
          title="Average Score"
          value={averageScore}
          trend={averageScore >= 80 ? 'up' : averageScore >= 60 ? 'neutral' : 'down'}
          trendValue={averageScore + '/100'}
          description="Overall accessibility rating"
        />
        
        <StatsCard
          title="Total Audits"
          value={totalAudits}
          trend={auditTrend > 0 ? 'up' : auditTrend < 0 ? 'down' : 'neutral'}
          trendValue={auditTrend > 0 ? '+' + Math.round(auditTrend) + '%' : Math.round(auditTrend) + '%'}
          description="Completed accessibility scans"
        />
        
        <StatsCard
          title="This Month"
          value={auditsThisMonth}
          trend={auditsThisMonth > previousMonthAudits ? 'up' : auditsThisMonth < previousMonthAudits ? 'down' : 'neutral'}
          trendValue={`${auditsThisMonth} audits`}
          description="Audits completed this month"
        />
      </div>

      {/* Score Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="Best Score"
          value={bestScore}
          trend={bestScore >= 90 ? 'up' : bestScore >= 70 ? 'neutral' : 'down'}
          trendValue={bestScore + '/100'}
          description="Highest accessibility score"
        />
        
        <StatsCard
          title="Worst Score"
          value={worstScore}
          trend={worstScore >= 70 ? 'up' : worstScore >= 50 ? 'neutral' : 'down'}
          trendValue={worstScore + '/100'}
          description="Lowest accessibility score"
        />
      </div>

      {/* Audit Frequency Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Audit Frequency (Last 30 Days)
        </h3>
        <AuditFrequencyChart sites={sites} />
      </div>
    </div>
  )
} 
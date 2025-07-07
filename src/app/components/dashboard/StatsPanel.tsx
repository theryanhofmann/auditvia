import { Site } from '@/app/types/dashboard'
import { StatsCard } from './StatsCard'
import { AuditFrequencyChart } from './AuditFrequencyChart'
import { Globe, TrendingUp, Shield, Activity } from 'lucide-react'

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

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Sites"
          value={totalSites}
          description="Websites being monitored"
          icon={Globe}
        />
        
        <StatsCard
          title="Average Score"
          value={`${averageScore}/100`}
          description="Overall accessibility rating"
          icon={Shield}
          valueColor={getScoreColor(averageScore)}
        />
        
        <StatsCard
          title="Total Audits"
          value={totalAudits}
          trend={auditTrend > 0 ? 'up' : auditTrend < 0 ? 'down' : 'neutral'}
          trendValue={auditTrend > 0 ? `+${Math.round(auditTrend)}%` : `${Math.round(auditTrend)}%`}
          description="Completed accessibility scans"
          icon={Activity}
        />
        
        <StatsCard
          title="This Month"
          value={auditsThisMonth}
          trend={auditsThisMonth > previousMonthAudits ? 'up' : auditsThisMonth < previousMonthAudits ? 'down' : 'neutral'}
          trendValue={auditsThisMonth > previousMonthAudits ? `+${auditsThisMonth - previousMonthAudits}` : auditsThisMonth < previousMonthAudits ? `${auditsThisMonth - previousMonthAudits}` : '—'}
          description="Audits completed this month"
          icon={TrendingUp}
        />
      </div>

      {/* Score Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard
          title="Best Score"
          value={`${bestScore}/100`}
          description="Highest accessibility score"
          icon={TrendingUp}
          valueColor={getScoreColor(bestScore)}
        />
        
        <StatsCard
          title="Worst Score"
          value={`${worstScore}/100`}
          description="Lowest accessibility score"
          icon={Shield}
          valueColor={getScoreColor(worstScore)}
        />
      </div>

      {/* Audit Frequency Chart */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Audit Frequency (Last 30 Days)
        </h3>
        <AuditFrequencyChart sites={sites} />
      </div>
    </div>
  )
} 
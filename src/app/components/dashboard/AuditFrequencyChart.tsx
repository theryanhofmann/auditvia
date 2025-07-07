import { Site } from '@/app/types/dashboard'
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns'

interface AuditFrequencyChartProps {
  sites: Site[]
}

export function AuditFrequencyChart({ sites }: AuditFrequencyChartProps) {
  // Generate last 30 days
  const endDate = new Date()
  const startDate = subDays(endDate, 29) // 30 days including today
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  // Count audits per day
  const auditsByDay = days.map(day => {
    const dayStart = startOfDay(day)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)

    const auditsCount = sites.filter(site => {
      if (!site.last_scan) return false
      const scanDate = new Date(site.last_scan)
      return scanDate >= dayStart && scanDate <= dayEnd
    }).length

    return {
      date: day,
      count: auditsCount,
      label: format(day, 'MMM dd')
    }
  })

  const maxCount = Math.max(...auditsByDay.map(d => d.count), 1)

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="flex items-end space-x-1 h-32">
        {auditsByDay.map((day, index) => {
          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0
          
          return (
            <div 
              key={day.date.toISOString()} 
              className="flex-1 flex flex-col items-center group"
            >
              <div 
                className="w-full bg-brand-500 hover:bg-brand-600 rounded-t-sm transition-colors relative"
                style={{ height: `${height}%` }}
              >
                {day.count > 0 && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {day.count} audit{day.count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 transform rotate-45 origin-left">
                {index % 5 === 0 ? format(day.date, 'M/d') : ''}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>Last 30 days</span>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-brand-500 rounded-sm"></div>
            <span>Audits completed</span>
          </div>
          <span>Max: {maxCount}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {auditsByDay.reduce((sum, day) => sum + day.count, 0)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Total audits
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {auditsByDay.filter(day => day.count > 0).length}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Active days
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {auditsByDay.length > 0 ? Math.round(auditsByDay.reduce((sum, day) => sum + day.count, 0) / auditsByDay.length * 10) / 10 : 0}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Daily average
          </div>
        </div>
      </div>
    </div>
  )
} 
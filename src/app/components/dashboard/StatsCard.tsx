import { ArrowUpIcon, ArrowDownIcon, MinusIcon, LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number | string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  description: string
  icon?: LucideIcon
  valueColor?: string
}

export function StatsCard({ 
  title, 
  value, 
  trend, 
  trendValue, 
  description, 
  icon: Icon,
  valueColor = 'text-gray-900 dark:text-gray-100'
}: StatsCardProps) {
  const trendIcon = {
    up: <ArrowUpIcon className="w-4 h-4 text-green-500" />,
    down: <ArrowDownIcon className="w-4 h-4 text-red-500" />,
    neutral: <MinusIcon className="w-4 h-4 text-gray-500" />
  }

  const trendColor = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {Icon && (
            <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          )}
          <h3 className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            {title}
          </h3>
        </div>
        {trend && trendValue && (
          <div className="flex items-center space-x-1">
            {trendIcon[trend]}
            <span className={`text-xs font-medium ${trendColor[trend]}`}>
              {trendValue}
            </span>
          </div>
        )}
      </div>
      
      <div className={`text-2xl font-semibold ${valueColor}`}>
        {value}
      </div>
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
        {description}
      </div>
    </div>
  )
} 
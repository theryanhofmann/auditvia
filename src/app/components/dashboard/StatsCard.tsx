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
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          )}
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
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
      
      <div className="mt-4">
        <div className={`text-2xl font-bold ${valueColor}`}>
          {value}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {description}
        </div>
      </div>
    </div>
  )
} 
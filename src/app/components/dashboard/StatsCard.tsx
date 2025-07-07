import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: number | string
  trend: 'up' | 'down' | 'neutral'
  trendValue: string
  description: string
}

export function StatsCard({ title, value, trend, trendValue, description }: StatsCardProps) {
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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        <div className="flex items-center space-x-1">
          {trendIcon[trend]}
          <span className={`text-xs font-medium ${trendColor[trend]}`}>
            {trendValue}
          </span>
        </div>
      </div>
      
      <div className="mt-2">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {value}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {description}
        </div>
      </div>
    </div>
  )
} 
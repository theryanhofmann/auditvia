interface ScoreBadgeProps {
  score?: number
  totalViolations?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ScoreBadge({ score, totalViolations, size = 'md', className = '' }: ScoreBadgeProps) {
  // Determine color based on score or violations
  const getColor = () => {
    if (typeof score === 'number') {
      if (score >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      if (score >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      if (score >= 50) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }

    if (typeof totalViolations === 'number') {
      if (totalViolations === 0) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      if (totalViolations <= 5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      if (totalViolations <= 10) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }

    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  }

  // Content based on score or violations
  const content = typeof score === 'number'
    ? `${score}/100`
    : typeof totalViolations === 'number'
      ? `${totalViolations} ${totalViolations === 1 ? 'Issue' : 'Issues'}`
      : 'No Data'

  // Title based on score or violations
  const title = typeof score === 'number'
    ? `Accessibility Score: ${score}/100`
    : typeof totalViolations === 'number'
      ? `${totalViolations} Accessibility ${totalViolations === 1 ? 'Issue' : 'Issues'} Found`
      : 'No accessibility data available'

  return (
    <div
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${getColor()} ${className}`}
      title={title}
    >
      {content}
    </div>
  )
} 
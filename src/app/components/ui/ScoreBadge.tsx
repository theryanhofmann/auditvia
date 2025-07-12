interface ScoreBadgeProps {
  totalViolations: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ScoreBadge({ totalViolations, size = 'md', className = '' }: ScoreBadgeProps) {
  // Determine color based on number of violations
  const getColor = (violations: number) => {
    if (violations === 0) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (violations <= 5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    if (violations <= 10) return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  }

  const violationText = totalViolations === 1 ? 'Issue' : 'Issues'

  return (
    <div
      className={`inline-flex items-center rounded-full font-medium ${sizeClasses[size]} ${getColor(totalViolations)} ${className}`}
      title={`${totalViolations} Accessibility ${violationText} Found`}
    >
      {totalViolations} {violationText}
    </div>
  )
} 
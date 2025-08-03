import { Lock } from 'lucide-react'

interface ProBadgeProps {
  className?: string
}

export function ProBadge({ className = '' }: ProBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ${className}`}>
      <Lock className="w-3 h-3 mr-1" />
      Pro
    </span>
  )
} 
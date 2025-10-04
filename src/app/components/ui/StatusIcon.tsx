import { Check, X, Circle } from 'lucide-react'

export type StatusType = 'pass' | 'fail' | 'advisory' | 'pending'

interface StatusIconProps {
  status: StatusType
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  className?: string
}

export function StatusIcon({ status, size = 'md', showTooltip = true, className = '' }: StatusIconProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const config = {
    pass: {
      icon: Check,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      tooltip: 'Pass - This is correct'
    },
    fail: {
      icon: X,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
      tooltip: 'Fail - This needs to be fixed'
    },
    advisory: {
      icon: Circle,
      bgColor: 'bg-gray-50',
      iconColor: 'text-gray-400',
      borderColor: 'border-gray-200',
      tooltip: 'Advisory - Best practice recommendation'
    },
    pending: {
      icon: Circle,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-400',
      borderColor: 'border-blue-200',
      tooltip: 'Pending - Checking...'
    }
  }

  const { icon: Icon, bgColor, iconColor, borderColor, tooltip } = config[status]

  return (
    <div
      className={`
        inline-flex items-center justify-center rounded-full border
        ${bgColor} ${borderColor} ${sizes[size]} ${className}
        ${showTooltip ? 'group relative' : ''}
      `}
      title={showTooltip ? tooltip : undefined}
    >
      <Icon className={`${iconColor} ${size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'}`} />

      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  )
}

/**
 * Inline status badge with text label
 */
interface StatusBadgeProps {
  status: StatusType
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const config = {
    pass: {
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200',
      defaultLabel: 'Pass'
    },
    fail: {
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      defaultLabel: 'Fail'
    },
    advisory: {
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
      borderColor: 'border-gray-200',
      defaultLabel: 'Advisory'
    },
    pending: {
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200',
      defaultLabel: 'Pending'
    }
  }

  const { bgColor, textColor, borderColor, defaultLabel } = config[status]

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${bgColor} ${borderColor} ${className}`}>
      <StatusIcon status={status} size="sm" showTooltip={false} />
      <span className={`text-xs font-medium ${textColor}`}>
        {label || defaultLabel}
      </span>
    </div>
  )
}

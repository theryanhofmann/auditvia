'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { designTokens } from './design-tokens'

interface DeltaBadgeProps {
  value: number
  format?: 'percentage' | 'number' | 'currency'
  inverse?: boolean // If true, negative is good (e.g., violations)
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function DeltaBadge({ 
  value, 
  format = 'percentage', 
  inverse = false,
  size = 'md',
  showIcon = true 
}: DeltaBadgeProps) {
  const isPositive = value > 0
  const isNegative = value < 0
  const isNeutral = value === 0

  // Determine if this is "good" or "bad" based on inverse flag
  const isGood = inverse ? isNegative : isPositive
  const isBad = inverse ? isPositive : isNegative

  const formatValue = () => {
    const absValue = Math.abs(value)
    switch (format) {
      case 'percentage':
        return `${absValue.toFixed(1)}%`
      case 'currency':
        return `$${absValue.toLocaleString()}`
      case 'number':
        return absValue.toLocaleString()
      default:
        return absValue.toString()
    }
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-0.5',
    md: 'text-sm px-2 py-1 gap-1',
    lg: 'text-base px-3 py-1.5 gap-1.5',
  }

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16,
  }

  if (isNeutral) {
    return (
      <span className={`inline-flex items-center rounded-full bg-slate-700/50 text-slate-400 font-medium ${sizeClasses[size]}`}>
        {showIcon && <Minus size={iconSize[size]} />}
        <span>0%</span>
      </span>
    )
  }

  return (
    <span 
      className={`
        inline-flex items-center rounded-full font-medium
        ${sizeClasses[size]}
        ${isGood ? 'bg-emerald-500/10 text-emerald-400' : ''}
        ${isBad ? 'bg-red-500/10 text-red-400' : ''}
      `}
      aria-label={`${isPositive ? 'Increased' : 'Decreased'} by ${formatValue()}`}
    >
      {showIcon && (
        isPositive ? <TrendingUp size={iconSize[size]} /> : <TrendingDown size={iconSize[size]} />
      )}
      <span>
        {isPositive && '+'}
        {formatValue()}
      </span>
    </span>
  )
}

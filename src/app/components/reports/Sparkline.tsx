'use client'

import { useMemo } from 'react'

interface SparklineProps {
  data: number[] | undefined | null
  width?: number
  height?: number
  color?: string
  showArea?: boolean
  className?: string
}

/**
 * Hardened Sparkline component
 * 
 * Handles edge cases:
 * - Empty/undefined/null data
 * - Single data point
 * - All values the same (min === max)
 * - Non-numeric values (filters them out)
 * - NaN/Infinity values
 */
export function Sparkline({ 
  data, 
  width = 100, 
  height = 24,
  color = '#3b82f6',
  showArea = true,
  className = ''
}: SparklineProps) {
  const { path, areaPath, min, max, isValid } = useMemo(() => {
    // Coerce to finite numbers and filter out invalid values
    const numericData = (data || [])
      .map(v => Number(v))
      .filter(v => Number.isFinite(v))

    // Need at least 2 valid points to draw a line
    if (numericData.length < 2) {
      return { 
        path: '', 
        areaPath: '', 
        min: 0, 
        max: 0, 
        isValid: false 
      }
    }

    const min = Math.min(...numericData)
    const max = Math.max(...numericData)
    
    // If all values are the same, draw a flat line at midpoint
    const range = max - min
    const isFlatLine = range === 0

    const points = numericData.map((value, index) => {
      const x = (index / (numericData.length - 1)) * width
      
      // For flat line, draw at midpoint
      // Otherwise, scale normally
      const y = isFlatLine 
        ? height / 2
        : height - ((value - min) / range) * height
      
      return { x, y }
    })

    // Line path
    const path = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')

    // Area path (for gradient fill)
    const areaPath = `
      ${path}
      L ${width} ${height}
      L 0 ${height}
      Z
    `

    return { path, areaPath, min, max, isValid: true }
  }, [data, width, height])

  // Show skeleton/fallback for invalid data
  if (!isValid) {
    return (
      <svg 
        width={width} 
        height={height} 
        className={className}
        aria-label="No data available"
        role="img"
      >
        <line 
          x1="0" 
          y1={height / 2} 
          x2={width} 
          y2={height / 2} 
          stroke="currentColor" 
          strokeWidth="1"
          opacity="0.2"
          strokeDasharray="2,2"
        />
      </svg>
    )
  }

  // Guard against NaN in display text
  const minDisplay = Number.isFinite(min) ? min.toFixed(0) : '0'
  const maxDisplay = Number.isFinite(max) ? max.toFixed(0) : '0'

  return (
    <svg 
      width={width} 
      height={height} 
      className={className}
      aria-label={`Sparkline showing trend from ${minDisplay} to ${maxDisplay}`}
      role="img"
    >
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {showArea && (
        <path
          d={areaPath}
          fill={`url(#gradient-${color})`}
        />
      )}
      
      <path
        d={path}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

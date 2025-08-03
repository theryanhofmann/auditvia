'use client'

import { useState } from 'react'
import { Badge } from './badge'
import { Button } from './button'
import { cn } from '@/app/lib/utils'

interface Violation {
  id: string
  rule: string
  selector: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help_url: string
  html: string
}

interface ViolationCardProps {
  violation: Violation
  status: 'resolved' | 'new' | 'unchanged'
}

export function ViolationCard({ violation, status }: ViolationCardProps) {
  const [expanded, setExpanded] = useState(false)

  const statusColors = {
    resolved: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    new: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    unchanged: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
  }

  const statusBadges = {
    resolved: <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">Resolved</Badge>,
    new: <Badge variant="destructive">New</Badge>,
    unchanged: <Badge variant="secondary">Unchanged</Badge>
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', statusColors[status])}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant={violation.impact === 'critical' ? 'destructive' : 'secondary'}>
              {violation.impact}
            </Badge>
            {statusBadges[status]}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Less' : 'More'}
          </Button>
        </div>

        <h3 className="font-medium mb-2">{violation.rule}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {violation.description}
        </p>

        {expanded && (
          <div className="space-y-4 border-t pt-4 mt-4">
            <div>
              <h4 className="text-sm font-medium mb-1">Selector</h4>
              <code className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded block">
                {violation.selector}
              </code>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-1">HTML</h4>
              <code className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded block">
                {violation.html}
              </code>
            </div>

            <div>
              <Button
                variant="link"
                size="sm"
                className="text-sm p-0 h-auto"
                onClick={() => window.open(violation.help_url, '_blank')}
              >
                Learn more about this rule
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
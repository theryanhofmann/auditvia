import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbSegment {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  segments: BreadcrumbSegment[]
}

export function Breadcrumbs({ segments }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1
        const hasHref = segment.href && !isLast

        return (
          <div key={index} className="flex items-center space-x-2">
            {hasHref ? (
              <Link
                href={segment.href!}
                className="hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {segment.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-gray-900 dark:text-gray-100' : ''}>
                {segment.label}
              </span>
            )}
            
            {!isLast && (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )
      })}
    </nav>
  )
} 
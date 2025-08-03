import { useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { cn } from '@/app/lib/utils'

interface ViolationAccordionProps {
  rule: string
  description: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  selector: string
  html?: string | null
  help_url?: string | null
}

export function ViolationAccordion({
  rule,
  description,
  impact,
  selector,
  html,
  help_url
}: ViolationAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'serious':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const getHowToFix = (rule: string, impact: string) => {
    // Add more specific fixes based on common WCAG rules
    switch (rule.toLowerCase()) {
      case 'color-contrast':
        return 'Ensure text has sufficient contrast with its background. Use tools like WebAIM Contrast Checker to verify your color choices meet WCAG standards (4.5:1 for normal text, 3:1 for large text).'
      case 'aria-hidden-focus':
        return 'Remove aria-hidden from focusable elements, or make them non-focusable. Elements with aria-hidden should not be interactive.'
      case 'button-name':
        return 'Add descriptive text to the button that explains its purpose. This can be visible text or aria-label if the button is icon-only.'
      case 'image-alt':
        return 'Add alt text to images that convey information. Use empty alt="" for decorative images. The alt text should describe the image\'s purpose or content.'
      default:
        return 'Review the WCAG guidelines linked above for specific remediation steps. Focus on making the content perceivable and operable for all users.'
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {rule}
            </h3>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-medium",
              getImpactColor(impact)
            )}>
              {impact}
            </span>
          </div>
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-gray-500 transition-transform",
              isExpanded && "transform rotate-180"
            )} 
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            {/* Description */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Issue Description
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {description}
              </p>
            </div>

            {/* WCAG Guidelines Link */}
            {help_url && (
              <div>
                <a
                  href={help_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View WCAG Guidelines
                </a>
              </div>
            )}

            {/* How to Fix */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                How to Fix
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                {getHowToFix(rule, impact)}
              </p>
            </div>

            {/* Technical Details */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Technical Details
              </h4>
              <div className="space-y-2">
                <div className="text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                  <span className="font-mono text-gray-600 dark:text-gray-400">
                    {selector}
                  </span>
                </div>
                {html && (
                  <div className="text-sm bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                    <pre className="font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {html}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
import { ExternalLink, AlertTriangle, Info, AlertCircle } from 'lucide-react'

interface Suggestion {
  rule: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  problem: string
  solution: string
  userImpact: string
  wcagLink: string
}

interface AiSuggestionCardProps {
  suggestion: Suggestion
}

export function AiSuggestionCard({ suggestion }: AiSuggestionCardProps) {
  const impactColor = {
    critical: 'text-red-600 dark:text-red-400',
    serious: 'text-orange-600 dark:text-orange-400',
    moderate: 'text-yellow-600 dark:text-yellow-400',
    minor: 'text-blue-600 dark:text-blue-400'
  }[suggestion.impact]

  const impactIcon = {
    critical: AlertTriangle,
    serious: AlertCircle,
    moderate: AlertCircle,
    minor: Info
  }[suggestion.impact]

  const Icon = impactIcon

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${impactColor}`} />
          <h3 className="font-medium">{suggestion.rule}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${impactColor}`}
          >
            {suggestion.impact}
          </span>
        </div>
        <a
          href={suggestion.wcagLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="sr-only">View WCAG guideline</span>
        </a>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium">Problem</h4>
          <p className="text-sm text-muted-foreground">{suggestion.problem}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium">Suggested Fix</h4>
          <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-sm">
            <code>{suggestion.solution}</code>
          </pre>
        </div>

        <div>
          <h4 className="text-sm font-medium">User Impact</h4>
          <p className="text-sm text-muted-foreground">{suggestion.userImpact}</p>
        </div>
      </div>
    </div>
  )
} 
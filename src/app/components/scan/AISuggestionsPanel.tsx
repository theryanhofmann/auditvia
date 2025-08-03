import { useState, useEffect } from 'react'
import { Card } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { SparklesIcon } from '@heroicons/react/24/solid'

interface Violation {
  rule: string
  impact: string
  description: string
  instances?: Array<any>
}

interface AISuggestions {
  summary: string[]
  fixes: string[]
  impact: number
}

interface AISuggestionsPanelProps {
  violations: Violation[]
  url: string
}

export function AISuggestionsPanel({ violations, url }: AISuggestionsPanelProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AISuggestions | null>(null)

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/ai/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ violations, url }),
        })

        if (!response.ok) {
          if (response.status === 403) {
            setError('AI suggestions are only available with a Pro subscription')
          } else {
            throw new Error('Failed to fetch suggestions')
          }
          return
        }

        const data = await response.json()
        setSuggestions(data)
      } catch (err) {
        console.error('Error fetching suggestions:', err)
        setError('Failed to generate suggestions. Please try again later.')
        toast.error('Failed to generate AI suggestions')
      } finally {
        setLoading(false)
      }
    }

    if (violations.length > 0 && session?.user) {
      fetchSuggestions()
    }
  }, [violations, url, session?.user])

  if (!session?.user) return null

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <SparklesIcon className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-semibold">AI Suggestions</h2>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <div className="text-muted-foreground text-sm p-4 bg-secondary/30 rounded-md">
          {error}
        </div>
      ) : suggestions ? (
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Top Issues Summary</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
              {suggestions.summary.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">Recommended Fixes</h3>
            <ul className="list-decimal list-inside space-y-2 text-muted-foreground text-sm">
              {suggestions.fixes.map((fix, i) => (
                <li key={i}>{fix}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2">Potential Impact</h3>
            <p className="text-muted-foreground text-sm">
              Implementing these fixes could improve your compliance score by approximately{' '}
              <span className="font-medium text-primary">
                {suggestions.impact} points
              </span>
              .
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  )
} 
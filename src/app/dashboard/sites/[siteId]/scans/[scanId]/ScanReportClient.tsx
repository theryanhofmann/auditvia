import { useState } from 'react'
import { useTeamPro } from '@/app/lib/hooks/useTeamPro'
import { AiSuggestionCard } from '@/app/components/ui/AiSuggestionCard'
import { ProFeatureCTA } from '@/app/components/ui/ProFeatureCTA'
import { Wand2 } from 'lucide-react'
import { toast } from 'sonner'

interface ScanReportClientProps {
  scan: {
    id: string
    site: {
      id: string
      team_id: string
    }
  }
  // ... other props
}

export function ScanReportClient({ scan, ...props }: ScanReportClientProps & { [key: string]: unknown }) {
  const { isLoading: isLoadingPro, hasPro } = useTeamPro(scan.site.team_id)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<any[] | null>(null)

  const handleGetSuggestions = async () => {
    if (isLoadingSuggestions) return

    try {
      setIsLoadingSuggestions(true)
      const response = await fetch(`/api/scans/${scan.id}/suggestions`)

      if (!response.ok) {
        throw new Error('Failed to get suggestions')
      }

      const data = await response.json()
      setSuggestions(data.suggestions)
    } catch (error) {
      console.error('Error getting suggestions:', error)
      toast.error('Failed to get AI suggestions')
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  // ... existing render code ...

  return (
    <div>
      {/* Existing scan report UI */}
      
      {/* AI Suggestions Section */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">AI Suggestions</h2>
          {!isLoadingPro && (
            hasPro ? (
              <button
                onClick={handleGetSuggestions}
                disabled={isLoadingSuggestions}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Wand2 className="h-4 w-4" />
                {isLoadingSuggestions ? 'Generating...' : 'Get AI Suggestions'}
              </button>
            ) : (
              <ProFeatureCTA
                teamId={scan.site.team_id}
                feature="AI Suggestions"
                description="Get AI-powered suggestions to fix accessibility issues."
              />
            )
          )}
        </div>

        {suggestions && (
          <div className="space-y-4">
            {suggestions.map((suggestion, index) => (
              <AiSuggestionCard key={index} suggestion={suggestion} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
} 
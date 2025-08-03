import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'

interface ProFeatureCTAProps {
  teamId: string
  feature: string
  description?: string
}

export function ProFeatureCTA({
  teamId,
  feature,
  description
}: ProFeatureCTAProps) {
  const router = useRouter()

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/50 dark:bg-yellow-900/20">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-yellow-100 p-1 dark:bg-yellow-900/50">
          <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-900 dark:text-yellow-500">
            Pro Feature: {feature}
          </h3>
          {description && (
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
              {description}
            </p>
          )}
          <button
            onClick={() => router.push(`/teams/${teamId}/settings`)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-yellow-900 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-400"
          >
            Upgrade to Pro
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  )
} 
'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { ViolationCard } from '@/app/components/ui/ViolationCard'
import { ScoreBadge } from '@/app/components/ui/ScoreBadge'
import { Button } from '@/app/components/ui/button'
import { UpgradeModal } from '@/app/components/ui/UpgradeModal'

interface Issue {
  id: string
  rule: string
  selector: string
  impact: 'critical' | 'serious' | 'moderate' | 'minor'
  description: string
  help_url: string
  html: string
}

interface Scan {
  id: string
  status: string
  started_at: string
  finished_at: string | null
  total_violations: number
  passes: number
  incomplete: number
  inapplicable: number
  sites: {
    id: string
    name: string | null
    url: string
    user_id: string
  }
  issues: Issue[]
}

interface CompareClientProps {
  oldScan: Scan
  newScan: Scan
  diff: {
    resolved: Issue[]
    added: Issue[]
    unchanged: Issue[]
  }
  isPro: boolean
}

export function CompareClient({ oldScan, newScan, diff, isPro }: CompareClientProps) {
  const [showUpgrade, setShowUpgrade] = useState(false)

  if (!isPro) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-4">Pro Feature</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Scan comparison is available on Pro plans.
        </p>
        <Button onClick={() => setShowUpgrade(true)}>Upgrade to Pro</Button>
        <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} />
      </div>
    )
  }

  const oldScore = calculateScore(oldScan)
  const newScore = calculateScore(newScan)
  const _scoreDiff = newScore - oldScore

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Previous Scan</h3>
          <ScoreBadge score={oldScore} size="lg" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {new Date(oldScan.started_at).toLocaleDateString()}
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Latest Scan</h3>
          <ScoreBadge score={newScore} size="lg" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {new Date(newScan.started_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <h4 className="font-medium text-green-700 dark:text-green-300">Resolved</h4>
          <p className="text-2xl font-bold text-green-800 dark:text-green-200">{diff.resolved.length}</p>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <h4 className="font-medium text-red-700 dark:text-red-300">New Issues</h4>
          <p className="text-2xl font-bold text-red-800 dark:text-red-200">{diff.added.length}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">Unchanged</h4>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{diff.unchanged.length}</p>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Issues</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="unchanged">Unchanged</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-4">
            {diff.resolved.map(issue => (
              <ViolationCard key={issue.id} violation={issue} status="resolved" />
            ))}
            {diff.added.map(issue => (
              <ViolationCard key={issue.id} violation={issue} status="new" />
            ))}
            {diff.unchanged.map(issue => (
              <ViolationCard key={issue.id} violation={issue} status="unchanged" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resolved">
          <div className="space-y-4">
            {diff.resolved.map(issue => (
              <ViolationCard key={issue.id} violation={issue} status="resolved" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="new">
          <div className="space-y-4">
            {diff.added.map(issue => (
              <ViolationCard key={issue.id} violation={issue} status="new" />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="unchanged">
          <div className="space-y-4">
            {diff.unchanged.map(issue => (
              <ViolationCard key={issue.id} violation={issue} status="unchanged" />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function calculateScore(scan: Scan): number {
  const total = scan.total_violations + scan.passes + scan.incomplete + scan.inapplicable
  if (total === 0) return 0
  
  // Treat inapplicable as successful tests (consistent with other score calculations)
  const successfulTests = scan.passes + scan.inapplicable
  return Math.round((successfulTests / total) * 100)
} 
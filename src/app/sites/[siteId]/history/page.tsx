import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Navigation } from '@/app/components/Navigation'
import { ScanHistoryClient } from './ScanHistoryClient'
import { createClient } from '@/app/lib/supabase/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

interface PageProps {
  params: Promise<{
    siteId: string
  }>
}

export default async function ScanHistoryPage({ params }: PageProps) {
  const { siteId } = await params
  
  // Get session for user verification
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null

  const supabase = await createClient()

  // Fetch site data to verify ownership and get site details
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, name, url, user_id')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    notFound()
  }

  // If site belongs to a user, ensure current user has access
  if (site.user_id && site.user_id !== userId) {
    notFound()
  }

  const siteName = site.name || new URL(site.url).hostname
  const siteUrl = site.url

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Scan History
              </h1>
              <div className="mt-2">
                <p className="text-xl text-zinc-700 dark:text-zinc-300">
                  {siteName}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {siteUrl}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scan History Content */}
        <ScanHistoryClient siteId={siteId} />
      </div>
    </div>
  )
} 
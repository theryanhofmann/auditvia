import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ScanHistoryClient } from './ScanHistoryClient'
import { Breadcrumbs } from '@/app/components/ui/Breadcrumbs'
import { Settings } from 'lucide-react'
import Link from 'next/link'

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

  if (!userId) {
    notFound()
  }

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

  // Verify site belongs to the authenticated user
  if (site.user_id !== userId) {
    notFound()
  }

  const siteName = site.name || new URL(site.url).hostname
  const siteUrl = site.url

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumbs
        segments={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Scan History' }
        ]}
      />

      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {siteName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {siteName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {siteUrl}
              </p>
            </div>
          </div>
          
          <Link
            href={`/dashboard/sites/${siteId}/settings`}
            className="inline-flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </div>
      </div>

      {/* Scan History Content */}
      <ScanHistoryClient siteId={siteId} />
    </div>
  )
} 
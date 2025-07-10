import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { SiteSettingsClient } from './SiteSettingsClient'
import { Breadcrumbs } from '@/app/components/ui/Breadcrumbs'

interface PageProps {
  params: Promise<{
    siteId: string
  }>
}

export default async function SiteSettingsPage({ params }: PageProps) {
  const { siteId } = await params
  
  // Get session for user verification
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null

  if (!userId) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch site data to verify ownership and get site details
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, name, url, user_id, monitoring, custom_domain, created_at, updated_at')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    notFound()
  }

  // Verify site belongs to the authenticated user
  if (site.user_id !== userId) {
    notFound()
  }

  const siteName = site.name || site.custom_domain || new URL(site.url).hostname
  const siteUrl = site.url

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumbs
        segments={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Scan History', href: `/dashboard/sites/${siteId}` },
          { label: 'Settings' }
        ]}
      />

      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              {siteName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Site Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {siteName} • {siteUrl}
            </p>
          </div>
        </div>
      </div>

      {/* Site Settings Content */}
      <SiteSettingsClient site={site} />
    </div>
  )
} 
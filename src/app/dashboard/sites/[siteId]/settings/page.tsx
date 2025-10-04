import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { SiteSettingsClient } from './SiteSettingsClient'
import { Breadcrumbs } from '@/app/components/ui/Breadcrumbs'
import type { Database } from '@/app/types/database'

interface PageProps {
  params: Promise<{
    siteId: string
  }>
  searchParams: Promise<{
    teamId?: string
  }>
}

export default async function SiteSettingsPage({ params, searchParams }: PageProps) {
  const { siteId } = await params
  const { teamId: _queryTeamId } = await searchParams
  
  // Get session for user verification
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null

  if (!userId) {
    redirect('/login')
  }

  // Use service role to bypass RLS for verification
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // First, fetch the site to get its team_id
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, name, url, team_id, monitoring, custom_domain, created_at, updated_at, github_repo, repository_mode')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    console.error('🔧 [site-settings] Site not found:', { 
      siteId,
      error: siteError?.message,
      code: siteError?.code
    })
    notFound()
  }

  // Use the teamId from the site (not from query params)
  const teamId = site.team_id

  // Verify user has access to this team
  const { data: teamMember, error: teamError } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()

  if (teamError || !teamMember) {
    console.error('🔧 [site-settings] Access denied - not a team member')
    notFound()
  }

  const siteName = site.name || site.custom_domain || new URL(site.url).hostname
  const siteUrl = site.url

  const createdDate = new Date(site.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Breadcrumbs
              segments={[
                { label: 'Sites', href: '/dashboard/sites' },
                { label: 'History', href: `/dashboard/sites/${siteId}/history?teamId=${teamId}` },
                { label: 'Settings' }
              ]}
            />
          </div>

          {/* Title & Meta */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900">
                {siteName}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-500">URL:</span>
                  <a 
                    href={siteUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {new URL(siteUrl).hostname}
                  </a>
                </div>
                <div className="text-sm text-gray-500">
                  •
                </div>
                <div className="text-sm text-gray-500">
                  Added {createdDate}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <SiteSettingsClient site={site} />
      </div>
    </div>
  )
} 
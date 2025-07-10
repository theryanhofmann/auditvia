import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Navigation } from '@/app/components/Navigation'
import { ScanReportClient } from './ScanReportClient'
import { createClient } from '@/app/lib/supabase/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

interface PageProps {
  params: Promise<{
    siteId: string
    scanId: string
  }>
}

export default async function ScanReportPage({ params }: PageProps) {
  const { siteId, scanId } = await params
  
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

  // Verify scan belongs to this site (basic validation)
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('id, site_id, status')
    .eq('id', scanId)
    .eq('site_id', siteId)
    .single()

  if (scanError || !scan) {
    notFound()
  }

  const siteName = site.name || new URL(site.url).hostname
  const siteUrl = site.url

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Navigation */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
            <span className="text-zinc-400">/</span>
            <Link
              href={`/sites/${siteId}/history`}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              Scan History
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-zinc-600 dark:text-zinc-400">Report</span>
          </div>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Accessibility Report
              </h1>
              <div className="mt-2">
                <p className="text-xl text-zinc-700 dark:text-zinc-300">
                  {siteName}
                </p>
                <div className="flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <span>{siteUrl}</span>
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Report Content */}
        <ScanReportClient scanId={scanId} />
      </div>
    </div>
  )
} 
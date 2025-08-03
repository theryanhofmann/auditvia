import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { PublicScanReport } from './PublicScanReport'

interface Props {
  params: {
    scanId: string
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()
  const { data: scan } = await supabase
    .from('scans')
    .select(`
      *,
      sites (
        url
      )
    `)
    .eq('id', params.scanId)
    .eq('public', true)
    .single()

  if (!scan) {
    return {
      title: 'Scan Not Found | Auditvia',
    }
  }

  const score = scan.score || 0
  const scoreText = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Improvement'

  return {
    title: `${scan.sites?.url} Accessibility Report | Auditvia`,
    description: `Accessibility scan results for ${scan.sites?.url}. Score: ${score}/100 (${scoreText})`,
    openGraph: {
      title: `${scan.sites?.url} Accessibility Report`,
      description: `Accessibility scan results for ${scan.sites?.url}. Score: ${score}/100 (${scoreText})`,
      type: 'website',
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/og?score=${score}&url=${encodeURIComponent(scan.sites?.url || '')}`,
          width: 1200,
          height: 630,
          alt: `Accessibility score: ${score}/100`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
    },
  }
}

export default async function PublicScanPage({ params }: Props) {
  const supabase = await createClient()

  // Get scan data
  const { data: scan } = await supabase
    .from('scans')
    .select(`
      *,
      sites (
        id,
        url,
        name
      ),
      issues (
        *
      )
    `)
    .eq('id', params.scanId)
    .eq('public', true)
    .single()

  // Return 404 if scan doesn't exist or isn't public
  if (!scan) {
    notFound()
  }

  return <PublicScanReport scan={scan} />
} 
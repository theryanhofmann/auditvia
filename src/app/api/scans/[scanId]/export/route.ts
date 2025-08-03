import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'
import { requirePro } from '@/app/lib/middleware/requirePro'

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  // Check Pro access
  const proCheck = await requirePro(request)
  if (proCheck) return proCheck

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 }
    )
  }

  const supabase = await createClient()

  // Get scan with site details and issues
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select(`
      id,
      status,
      started_at,
      finished_at,
      total_violations,
      passes,
      incomplete,
      inapplicable,
      sites!inner (
        id,
        name,
        url,
        user_id
      ),
      issues (
        id,
        rule,
        selector,
        severity,
        impact,
        description,
        help_url,
        html
      )
    `)
    .eq('id', params.scanId)
    .single()

  if (scanError || !scan) {
    return new NextResponse(
      JSON.stringify({ error: 'Scan not found' }),
      { status: 404 }
    )
  }

  // Verify ownership
  if (scan.sites[0]?.user_id !== session.user.id) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 403 }
    )
  }

  // Generate PDF report
  // TODO: Implement actual PDF generation
  const reportData = {
    scan: {
      id: scan.id,
      status: scan.status,
      started_at: scan.started_at,
      finished_at: scan.finished_at,
      total_violations: scan.total_violations,
      passes: scan.passes,
      incomplete: scan.incomplete,
      inapplicable: scan.inapplicable,
      site: scan.sites
    },
    issues: scan.issues,
    generated_at: new Date().toISOString()
  }

  // For now, return JSON (replace with actual PDF generation)
  return new NextResponse(
    JSON.stringify(reportData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="accessibility-report-${scan.id}.json"`
      }
    }
  )
} 
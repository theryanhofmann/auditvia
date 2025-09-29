import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { auth } from '@/auth'
import { requireProFeature } from '@/lib/pro-features'

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  console.log('📄 [pdf-export] Starting PDF export for scan:', params.scanId)
  
  // Verify authentication
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 }
    )
  }

  const supabase = await createClient()

  // Get scan with site and team details
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
        user_id,
        team_id,
        teams!inner (
          id,
          name,
          created_by,
          created_at,
          billing_status,
          stripe_customer_id,
          stripe_subscription_id,
          trial_ends_at,
          is_pro
        )
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
    console.error('📄 [pdf-export] Scan not found:', scanError)
    return new NextResponse(
      JSON.stringify({ error: 'Scan not found' }),
      { status: 404 }
    )
  }

  // Verify ownership through team membership
  const { data: teamMember, error: memberError } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', scan.sites[0].team_id)
    .eq('user_id', session.user.id)
    .single()

  if (memberError || !teamMember) {
    console.error('📄 [pdf-export] Access denied:', memberError)
    return new NextResponse(
      JSON.stringify({ error: 'Access denied' }),
      { status: 403 }
    )
  }

  // Check Pro feature access
  const team = scan.sites[0].teams[0]
  try {
    requireProFeature(team, 'PDF_EXPORT')
    console.log('📄 [pdf-export] Pro access verified for team:', team.name)
  } catch (error) {
    console.error('📄 [pdf-export] Pro feature required:', error)
    return new NextResponse(
      JSON.stringify({ 
        error: 'Pro feature required',
        message: 'PDF export requires a Pro plan. Upgrade to access this feature.',
        feature: 'PDF_EXPORT'
      }),
      { status: 403 }
    )
  }

  // Generate PDF report data
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
      site: scan.sites[0]
    },
    issues: scan.issues,
    team: {
      name: team.name,
      billing_status: team.billing_status
    },
    generated_at: new Date().toISOString(),
    export_version: '2.0'
  }

  console.log(`📄 [pdf-export] ✅ Generated report for scan ${scan.id} (${scan.issues.length} issues)`)

  // For now, return JSON (TODO: Implement actual PDF generation)
  return new NextResponse(
    JSON.stringify(reportData, null, 2),
    {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="accessibility-report-${scan.id}.json"`
      }
    }
  )
}
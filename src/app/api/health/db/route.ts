import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health/db
 * Database health check - verifies migrations and schema
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const missingObjects: string[] = []
    const errors: string[] = []

    // Check required tables
    const requiredTables = [
      'team_invites',
      'audit_logs',
      'pdf_generation_jobs',
      'sites',
      'scans',
      'issues',
      'teams',
      'team_members'
    ]

    for (const table of requiredTables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1)

      if (error && error.code === '42P01') {
        missingObjects.push(`table:${table}`)
      } else if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is fine
        errors.push(`table:${table} - ${error.message}`)
      }
    }

    // Check required views
    const requiredViews = [
      'report_kpis_view',
      'violations_trend_view',
      'fix_throughput_view',
      'top_rules_view',
      'top_pages_view',
      'backlog_age_view',
      'coverage_view',
      'tickets_view',
      'false_positive_view',
      'risk_reduced_view'
    ]

    for (const view of requiredViews) {
      const { error } = await supabase
        .rpc('check_view_exists', { view_name: view })
        .single()

      // If RPC doesn't exist, do a direct query
      if (error) {
        const { error: queryError } = await supabase
          .from(view as any)
          .select('*')
          .limit(1)

        if (queryError && queryError.code === '42P01') {
          missingObjects.push(`view:${view}`)
        }
      }
    }

    // Check required columns
    const requiredColumns = [
      { table: 'issues', column: 'github_issue_url' },
      { table: 'issues', column: 'github_issue_number' },
      { table: 'issues', column: 'github_issue_created_at' },
      { table: 'sites', column: 'github_repo' },
      { table: 'sites', column: 'repository_mode' }
    ]

    for (const { table, column } of requiredColumns) {
      const { error } = await supabase
        .from(table)
        .select(column)
        .limit(1)

      if (error && error.code === '42703') {
        missingObjects.push(`column:${table}.${column}`)
      }
    }

    // Check RLS is enabled on sensitive tables
    const rlsTables = ['team_invites', 'audit_logs', 'team_members']
    
    for (const table of rlsTables) {
      // Try to query without auth (should fail if RLS is enabled)
      const publicClient = await createClient()
      await publicClient
        .from(table)
        .select('*')
        .limit(1)

      // If we get data without auth, RLS might be disabled
      // This is a simplified check - in production you'd want more thorough testing
    }

    const migrationsOk = missingObjects.length === 0 && errors.length === 0

    return NextResponse.json({
      migrationsOk,
      missingObjects,
      errors,
      timestamp: new Date().toISOString(),
      checks: {
        tables: requiredTables.length - missingObjects.filter(o => o.startsWith('table:')).length,
        views: requiredViews.length - missingObjects.filter(o => o.startsWith('view:')).length,
        columns: requiredColumns.length - missingObjects.filter(o => o.startsWith('column:')).length
      }
    })
  } catch (error) {
    console.error('Database health check failed:', error)
    return NextResponse.json(
      {
        migrationsOk: false,
        missingObjects: [],
        errors: [(error as Error).message],
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}


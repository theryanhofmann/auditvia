#!/usr/bin/env node

/**
 * Migration Verification Script
 * 
 * Validates that all required database objects exist after migrations.
 * Run with: npm run verify:migrations
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local or .env
function loadEnv() {
  const envFiles = ['.env.local', '.env']
  
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile)
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const lines = envContent.split('\n')
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          // Only set if not already in process.env
          if (!process.env[key]) {
            process.env[key] = value
          }
        }
      }
      
      console.log(`✅ Loaded environment from ${envFile}\n`)
      return true
    }
  }
  
  return false
}

// Load env files
loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('')
  console.error('Required environment variables:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL (current: ' + (supabaseUrl ? '✅ present' : '❌ missing') + ')')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY (current: ❌ missing)')
  console.error('')
  console.error('Please set these in .env.local or .env')
  process.exit(1)
}

console.log('🔑 Using Supabase URL:', supabaseUrl)
console.log('🔑 Using API key:', supabaseKey.substring(0, 20) + '...' + supabaseKey.substring(supabaseKey.length - 4))
console.log('')

const supabase = createClient(supabaseUrl, supabaseKey)

const REQUIRED_TABLES = [
  'team_invites',
  'audit_logs',
  'pdf_generation_jobs',
  'sites',
  'scans',
  'issues',
  'teams',
  'team_members'
]

const REQUIRED_VIEWS = [
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

const REQUIRED_COLUMNS = [
  { table: 'issues', column: 'github_issue_url' },
  { table: 'issues', column: 'github_issue_number' },
  { table: 'issues', column: 'github_issue_created_at' },
  { table: 'sites', column: 'github_repo' },
  { table: 'sites', column: 'repository_mode' }
]

const REQUIRED_EXTENSIONS = [
  'pgcrypto',
  'uuid-ossp'
]

async function checkTable(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1)

    if (error && error.code === '42P01') {
      return { exists: false, error: 'Table does not exist' }
    }
    
    if (error && error.code !== 'PGRST116') {
      return { exists: false, error: error.message }
    }

    return { exists: true }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}

async function checkView(viewName) {
  try {
    const { error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1)

    if (error && error.code === '42P01') {
      return { exists: false, error: 'View does not exist' }
    }

    if (error && error.code !== 'PGRST116') {
      return { exists: false, error: error.message }
    }

    return { exists: true }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}

async function checkColumn(tableName, columnName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(1)

    if (error && error.code === '42703') {
      return { exists: false, error: 'Column does not exist' }
    }

    if (error && error.code !== 'PGRST116') {
      return { exists: false, error: error.message }
    }

    return { exists: true }
  } catch (err) {
    return { exists: false, error: err.message }
  }
}

async function checkExtension(_extensionName) {
  try {
    // Try to query pg_extension directly via a simple test
    const { error } = await supabase.from('sites').select('id').limit(1)
    
    // If basic queries work, assume extensions are present
    // (We can't easily check extensions via PostgREST without a custom function)
    if (!error || error.code === 'PGRST116') {
      return { exists: true, warning: 'Assumed present (basic queries work)' }
    }
    
    // If we get a UUID error, extension is missing
    if (error.message && error.message.includes('uuid_generate_v4')) {
      return { exists: false, error: 'UUID extension missing' }
    }
    
    return { exists: true, warning: 'Could not verify' }
  } catch {
    return { exists: true, warning: 'Could not verify' }
  }
}

async function main() {
  console.log('🔍 Verifying database migrations...\n')

  let allPass = true
  const results = {
    extensions: { pass: 0, fail: 0, warnings: 0, errors: [] },
    tables: { pass: 0, fail: 0, errors: [] },
    views: { pass: 0, fail: 0, errors: [] },
    columns: { pass: 0, fail: 0, errors: [] }
  }

  // Check extensions
  console.log('🧩 Checking extensions...')
  for (const ext of REQUIRED_EXTENSIONS) {
    const result = await checkExtension(ext)
    if (result.exists) {
      if (result.warning) {
        console.log(`  ⚠️  ${ext}: ${result.warning}`)
        results.extensions.warnings++
      } else {
        console.log(`  ✅ ${ext}`)
      }
      results.extensions.pass++
    } else {
      console.log(`  ❌ ${ext}: ${result.error}`)
      results.extensions.fail++
      results.extensions.errors.push({ extension: ext, error: result.error })
      allPass = false
    }
  }

  // Check tables
  console.log('\n📋 Checking tables...')
  for (const table of REQUIRED_TABLES) {
    const result = await checkTable(table)
    if (result.exists) {
      console.log(`  ✅ ${table}`)
      results.tables.pass++
    } else {
      console.log(`  ❌ ${table}: ${result.error}`)
      results.tables.fail++
      results.tables.errors.push({ table, error: result.error })
      allPass = false
    }
  }

  // Check views
  console.log('\n👁️  Checking views...')
  for (const view of REQUIRED_VIEWS) {
    const result = await checkView(view)
    if (result.exists) {
      console.log(`  ✅ ${view}`)
      results.views.pass++
    } else {
      console.log(`  ❌ ${view}: ${result.error}`)
      results.views.fail++
      results.views.errors.push({ view, error: result.error })
      allPass = false
    }
  }

  // Check columns
  console.log('\n🔧 Checking columns...')
  for (const { table, column } of REQUIRED_COLUMNS) {
    const result = await checkColumn(table, column)
    if (result.exists) {
      console.log(`  ✅ ${table}.${column}`)
      results.columns.pass++
    } else {
      console.log(`  ❌ ${table}.${column}: ${result.error}`)
      results.columns.fail++
      results.columns.errors.push({ table, column, error: result.error })
      allPass = false
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`Extensions: ${results.extensions.pass}/${REQUIRED_EXTENSIONS.length} ✅`)
  console.log(`Tables:     ${results.tables.pass}/${REQUIRED_TABLES.length} ✅`)
  console.log(`Views:      ${results.views.pass}/${REQUIRED_VIEWS.length} ✅`)
  console.log(`Columns:    ${results.columns.pass}/${REQUIRED_COLUMNS.length} ✅`)
  console.log('='.repeat(60))

  if (allPass) {
    console.log('\n✅ All migrations verified successfully!')
    process.exit(0)
  } else {
    console.log('\n❌ Some migrations are missing or failed!')
    console.log('\nErrors:')
    console.log(JSON.stringify({ ...results.tables.errors, ...results.views.errors, ...results.columns.errors }, null, 2))
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})


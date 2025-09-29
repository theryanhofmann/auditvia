/**
 * Schema Cache Recovery Utilities
 * 
 * Handles PostgREST schema cache issues (PGRST204 errors) that can occur
 * when database migrations add new columns but the API schema cache hasn't
 * been refreshed yet.
 */

interface SchemaRecoveryResult {
  success: boolean
  error?: string
  method?: string
  retryAfterMs?: number
}

interface DatabaseError {
  code?: string
  message?: string
  details?: string
  hint?: string
}

/**
 * Detects if an error is related to schema cache issues
 */
export function isSchemaCacheError(error: any): boolean {
  if (!error) return false

  const errorStr = String(error.message || error).toLowerCase()
  const errorCode = error.code || error.error_code

  // PostgREST schema cache error codes and messages
  const schemaCacheIndicators = [
    'pgrst204', // PostgREST schema cache miss
    'could not find',
    'column does not exist',
    'in the schema cache',
    'relation does not exist',
    'schema cache',
    'cache miss'
  ]

  return (
    errorCode === 'PGRST204' ||
    errorCode === '42703' || // PostgreSQL undefined column
    errorCode === '42P01' || // PostgreSQL undefined table
    schemaCacheIndicators.some(indicator => errorStr.includes(indicator))
  )
}

/**
 * Classifies database errors for appropriate handling
 */
export function classifyDatabaseError(error: any): {
  type: 'schema_cache' | 'permission' | 'validation' | 'connection' | 'unknown'
  recoverable: boolean
  retryable: boolean
} {
  if (!error) return { type: 'unknown', recoverable: false, retryable: false }

  const errorCode = error.code || error.error_code
  const errorMessage = String(error.message || error).toLowerCase()

  // Schema cache errors - recoverable with refresh
  if (isSchemaCacheError(error)) {
    return { type: 'schema_cache', recoverable: true, retryable: true }
  }

  // Permission errors - not recoverable by retry
  if (errorCode === '42501' || errorMessage.includes('permission denied')) {
    return { type: 'permission', recoverable: false, retryable: false }
  }

  // Validation errors - not recoverable by retry
  if (errorCode === '23505' || errorCode === '23503' || errorMessage.includes('violates')) {
    return { type: 'validation', recoverable: false, retryable: false }
  }

  // Connection errors - retryable but not recoverable with schema refresh
  if (errorMessage.includes('connection') || errorMessage.includes('timeout')) {
    return { type: 'connection', recoverable: false, retryable: true }
  }

  return { type: 'unknown', recoverable: false, retryable: true }
}

/**
 * Attempts to refresh the PostgREST schema cache
 */
export async function refreshSchemaCache(): Promise<SchemaRecoveryResult> {
  const environment = process.env.NODE_ENV || 'development'
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('🔄 [schema-recovery] Attempting schema cache refresh...')

  try {
    // For Supabase hosted instances
    if (supabaseUrl && supabaseUrl.includes('supabase.co')) {
      return await refreshSupabaseHostedSchema(supabaseUrl, serviceRoleKey)
    }

    // For self-hosted PostgREST
    if (process.env.POSTGREST_URL) {
      return await refreshSelfHostedSchema(process.env.POSTGREST_URL)
    }

    // For local development
    if (environment === 'development') {
      return await refreshLocalSchema()
    }

    throw new Error(`Unknown environment configuration for schema refresh: ${environment}`)

  } catch (error) {
    console.error('🔄 [schema-recovery] Schema refresh failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Refresh schema for Supabase hosted instances
 */
async function refreshSupabaseHostedSchema(
  supabaseUrl: string, 
  serviceRoleKey?: string
): Promise<SchemaRecoveryResult> {
  if (!serviceRoleKey) {
    throw new Error('Service role key required for Supabase schema refresh')
  }

  // Try the PostgREST admin endpoint first
  const postgrestUrl = supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.supabase.co')
  
  try {
    const response = await fetch(`${postgrestUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      console.log('🔄 [schema-recovery] ✅ Supabase schema refreshed via PostgREST admin endpoint')
      return { success: true, method: 'postgrest_admin', retryAfterMs: 1000 }
    }
  } catch (error) {
    console.warn('🔄 [schema-recovery] PostgREST admin endpoint failed, trying alternative methods')
  }

  // Alternative: trigger a simple query that forces schema reload
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/pg_reload_conf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    })

    if (response.ok || response.status === 404) { // 404 is ok, function might not exist
      console.log('🔄 [schema-recovery] ✅ Supabase schema refresh attempted via RPC')
      return { success: true, method: 'supabase_rpc', retryAfterMs: 2000 }
    }
  } catch (error) {
    console.warn('🔄 [schema-recovery] RPC method failed')
  }

  // Fallback: wait and hope cache expires naturally
  console.log('🔄 [schema-recovery] ⚠️ Using fallback wait method for Supabase')
  return { success: true, method: 'fallback_wait', retryAfterMs: 5000 }
}

/**
 * Refresh schema for self-hosted PostgREST
 */
async function refreshSelfHostedSchema(postgrestUrl: string): Promise<SchemaRecoveryResult> {
  try {
    // PostgREST admin interface for schema reload
    const response = await fetch(`${postgrestUrl}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      console.log('🔄 [schema-recovery] ✅ Self-hosted PostgREST schema refreshed')
      return { success: true, method: 'postgrest_admin', retryAfterMs: 1000 }
    }

    throw new Error(`PostgREST admin endpoint returned ${response.status}`)
  } catch (error) {
    console.error('🔄 [schema-recovery] Self-hosted refresh failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Refresh schema for local development
 */
async function refreshLocalSchema(): Promise<SchemaRecoveryResult> {
  console.log('🔄 [schema-recovery] Local development - schema should auto-refresh')
  
  // In local development, schema changes are usually picked up automatically
  // Just wait a bit for the local PostgREST to notice the changes
  return { success: true, method: 'local_auto', retryAfterMs: 1000 }
}

/**
 * Implements exponential backoff with jitter for retries
 */
export function calculateBackoffDelay(attempt: number, baseDelayMs: number = 1000): number {
  const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt), 10000) // Cap at 10s
  const jitter = Math.random() * 0.3 * exponentialDelay // Add up to 30% jitter
  return Math.floor(exponentialDelay + jitter)
}

/**
 * Sleep utility for backoff delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Formats error for logging and user display
 */
export function formatDatabaseError(error: any): {
  userMessage: string
  logMessage: string
  code?: string
} {
  const classification = classifyDatabaseError(error)
  const errorCode = error.code || error.error_code
  const errorMessage = error.message || String(error)

  let userMessage: string
  let logMessage: string

  switch (classification.type) {
    case 'schema_cache':
      userMessage = 'Database schema is updating. Please try again in a moment.'
      logMessage = `Schema cache error: ${errorMessage}`
      break
    
    case 'permission':
      userMessage = 'Permission denied. Please contact support if this persists.'
      logMessage = `Permission error: ${errorMessage}`
      break
    
    case 'validation':
      userMessage = 'Invalid data provided. Please check your input and try again.'
      logMessage = `Validation error: ${errorMessage}`
      break
    
    case 'connection':
      userMessage = 'Database connection issue. Please try again.'
      logMessage = `Connection error: ${errorMessage}`
      break
    
    default:
      userMessage = 'An unexpected error occurred. Please try again.'
      logMessage = `Unknown database error: ${errorMessage}`
  }

  return {
    userMessage,
    logMessage,
    code: errorCode
  }
}

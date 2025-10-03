import { createClient } from '@/app/lib/supabase/server'

export interface AuditLogEntry {
  teamId: string
  actorUserId: string
  action: string
  targetUserId?: string
  targetEmail?: string
  metadata?: Record<string, any>
}

/**
 * Log a team action to the audit log
 */
export async function logTeamAction(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        team_id: entry.teamId,
        actor_user_id: entry.actorUserId,
        action: entry.action,
        target_user_id: entry.targetUserId,
        target_email: entry.targetEmail,
        metadata: entry.metadata || {}
      })

    if (error) {
      console.error('Failed to log audit entry:', error)
      // Don't throw - audit logging should not break the main flow
    }
  } catch (error) {
    console.error('Error logging audit entry:', error)
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Get recent audit logs for a team
 */
export async function getTeamAuditLogs(
  teamId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        target_email,
        metadata,
        created_at,
        actor:users!actor_user_id(email, raw_user_meta_data),
        target:users!target_user_id(email, raw_user_meta_data)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return []
  }
}

/**
 * Get audit logs for a specific user (for member detail drawer)
 */
export async function getUserAuditLogs(
  teamId: string,
  userId: string,
  limit: number = 20
): Promise<any[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        metadata,
        created_at,
        actor:users!actor_user_id(email, raw_user_meta_data)
      `)
      .eq('team_id', teamId)
      .or(`actor_user_id.eq.${userId},target_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch user audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching user audit logs:', error)
    return []
  }
}

// Audit action types
export const AuditAction = {
  INVITE_SENT: 'invite_sent',
  INVITE_ACCEPTED: 'invite_accepted',
  INVITE_REVOKED: 'invite_revoked',
  INVITE_RESENT: 'invite_resent',
  ROLE_CHANGED: 'role_changed',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_JOINED: 'member_joined'
} as const


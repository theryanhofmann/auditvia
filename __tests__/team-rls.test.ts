/**
 * Team RLS Policy Tests
 * 
 * Tests Row Level Security policies for team_members, team_invites, and audit_logs tables.
 * Ensures owners/admins can perform actions within their team and others are blocked.
 */

import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

const runDbTests = process.env.RUN_DB_TESTS === '1'
const d = runDbTests ? describe : describe.skip

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

d('Team RLS Policies', () => {
  let testTeamId: string
  let ownerUserId: string
  let memberUserId: string
  let outsiderUserId: string
  
  beforeAll(async () => {
    // Create test users and team
    const ownerResult = await adminClient.auth.admin.createUser({
      email: 'owner@test.com',
      password: 'password123',
      email_confirm: true
    })
    
    if (ownerResult.error) {
      console.error('Failed to create owner:', ownerResult.error)
      throw new Error(`Failed to create owner: ${ownerResult.error.message}`)
    }
    
    ownerUserId = ownerResult.data?.user?.id
    if (!ownerUserId) {
      throw new Error('Owner user ID is undefined')
    }
    
    // Also create record in public.users
    const { error: ownerUserError } = await adminClient.from('users').insert({
      id: ownerUserId,
      github_id: `test-owner-${Date.now()}`
    })
    if (ownerUserError) {
      console.error('Failed to create owner in public.users:', ownerUserError)
      throw new Error(`Failed to create owner in public.users: ${ownerUserError.message}`)
    }

    const memberResult = await adminClient.auth.admin.createUser({
      email: 'member@test.com',
      password: 'password123',
      email_confirm: true
    })
    
    if (memberResult.error) {
      console.error('Failed to create member:', memberResult.error)
      throw new Error(`Failed to create member: ${memberResult.error.message}`)
    }
    
    memberUserId = memberResult.data?.user?.id
    if (!memberUserId) {
      throw new Error('Member user ID is undefined')
    }
    
    // Also create record in public.users
    const { error: memberUserError } = await adminClient.from('users').insert({
      id: memberUserId,
      github_id: `test-member-${Date.now()}`
    })
    if (memberUserError) {
      console.error('Failed to create member in public.users:', memberUserError)
      throw new Error(`Failed to create member in public.users: ${memberUserError.message}`)
    }

    const outsiderResult = await adminClient.auth.admin.createUser({
      email: 'outsider@test.com',
      password: 'password123',
      email_confirm: true
    })
    
    if (outsiderResult.error) {
      console.error('Failed to create outsider:', outsiderResult.error)
      throw new Error(`Failed to create outsider: ${outsiderResult.error.message}`)
    }
    
    outsiderUserId = outsiderResult.data?.user?.id
    if (!outsiderUserId) {
      throw new Error('Outsider user ID is undefined')
    }
    
    // Also create record in public.users
    const { error: outsiderUserError } = await adminClient.from('users').insert({
      id: outsiderUserId,
      github_id: `test-outsider-${Date.now()}`
    })
    if (outsiderUserError) {
      console.error('Failed to create outsider in public.users:', outsiderUserError)
      throw new Error(`Failed to create outsider in public.users: ${outsiderUserError.message}`)
    }

    // Create test team
    const insertResult = await adminClient
      .from('teams')
      .insert({ name: 'Test Team', created_by: ownerUserId })
      .select()
    
    if (insertResult.error) {
      console.error('Failed to insert team:', JSON.stringify(insertResult.error, null, 2))
      throw new Error(`Failed to insert team: ${insertResult.error?.message || JSON.stringify(insertResult.error)}`)
    }
    
    if (!insertResult.data || insertResult.data.length === 0) {
      throw new Error('No team data returned from insert')
    }
    
    const team = insertResult.data[0]
    testTeamId = team.id
    if (!testTeamId) {
      throw new Error('Team ID is undefined')
    }

    // Note: Owner is automatically added by the on_team_created trigger
    
    // Add member
    const { error: memberError } = await adminClient
      .from('team_members')
      .insert({ team_id: testTeamId, user_id: memberUserId, role: 'member' })
    
    if (memberError) {
      console.error('Failed to add member to team:', memberError)
      throw new Error(`Failed to add member to team: ${memberError.message}`)
    }
  })

  afterAll(async () => {
    // Cleanup - only if IDs exist
    if (testTeamId) {
      await adminClient.from('team_members').delete().eq('team_id', testTeamId)
      await adminClient.from('teams').delete().eq('id', testTeamId)
    }
    
    // Delete from public.users (cascades will handle team_members)
    if (ownerUserId) {
      await adminClient.from('users').delete().eq('id', ownerUserId)
      await adminClient.auth.admin.deleteUser(ownerUserId)
    }
    
    if (memberUserId) {
      await adminClient.from('users').delete().eq('id', memberUserId)
      await adminClient.auth.admin.deleteUser(memberUserId)
    }
    
    if (outsiderUserId) {
      await adminClient.from('users').delete().eq('id', outsiderUserId)
      await adminClient.auth.admin.deleteUser(outsiderUserId)
    }
  })

  describe('team_invites RLS', () => {
    it('should allow owner to create invites', async () => {
      const ownerClient = createClient(supabaseUrl, supabaseAnonKey)
      await ownerClient.auth.signInWithPassword({
        email: 'owner@test.com',
        password: 'password123'
      })

      const { data, error } = await ownerClient
        .from('team_invites')
        .insert({
          team_id: testTeamId,
          email: 'newmember@test.com',
          role: 'member',
          invited_by_user_id: ownerUserId,
          status: 'pending'
        })
        .select()

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should block member from creating invites', async () => {
      const memberClient = createClient(supabaseUrl, supabaseAnonKey)
      await memberClient.auth.signInWithPassword({
        email: 'member@test.com',
        password: 'password123'
      })

      const { error } = await memberClient
        .from('team_invites')
        .insert({
          team_id: testTeamId,
          email: 'another@test.com',
          role: 'member',
          invited_by_user_id: memberUserId,
          status: 'pending'
        })

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501') // insufficient_privilege
    })

    it('should block outsider from viewing team invites', async () => {
      const outsiderClient = createClient(supabaseUrl, supabaseAnonKey)
      await outsiderClient.auth.signInWithPassword({
        email: 'outsider@test.com',
        password: 'password123'
      })

      const { data } = await outsiderClient
        .from('team_invites')
        .select()
        .eq('team_id', testTeamId)

      expect(data).toEqual([])
    })
  })

  describe('team_members RLS', () => {
    it('should allow owner to update member roles', async () => {
      const ownerClient = createClient(supabaseUrl, supabaseAnonKey)
      await ownerClient.auth.signInWithPassword({
        email: 'owner@test.com',
        password: 'password123'
      })

      const { error } = await ownerClient
        .from('team_members')
        .update({ role: 'admin' })
        .eq('team_id', testTeamId)
        .eq('user_id', memberUserId)

      expect(error).toBeNull()

      // Revert back to member for next test
      const { error: revertError } = await adminClient
        .from('team_members')
        .update({ role: 'member' })
        .eq('team_id', testTeamId)
        .eq('user_id', memberUserId)
      
      expect(revertError).toBeNull()
      
      // Verify it was reverted
      const { data: verifyData } = await adminClient
        .from('team_members')
        .select('role')
        .eq('team_id', testTeamId)
        .eq('user_id', memberUserId)
        .single()
      
      expect(verifyData?.role).toBe('member')
    })

    it('should block member from updating roles', async () => {
      // Verify member role before test
      const { data: roleBefore } = await adminClient
        .from('team_members')
        .select('role')
        .eq('team_id', testTeamId)
        .eq('user_id', memberUserId)
        .single()
      
      expect(roleBefore?.role).toBe('member')
      
      const memberClient = createClient(supabaseUrl, supabaseAnonKey)
      await memberClient.auth.signInWithPassword({
        email: 'member@test.com',
        password: 'password123'
      })

      const { data: _data, error } = await memberClient
        .from('team_members')
        .update({ role: 'admin' })
        .eq('team_id', testTeamId)
        .eq('user_id', memberUserId)

      // Check if role actually changed
      const { data: roleAfter } = await adminClient
        .from('team_members')
        .select('role')
        .eq('team_id', testTeamId)
        .eq('user_id', memberUserId)
        .single()

      // The update should be blocked - role should still be 'member'
      expect(roleAfter?.role).toBe('member')
      if (error) {
        expect(error.code).toBe('42501') // insufficient_privilege
      }
    })

    it('should allow team members to view other members', async () => {
      const memberClient = createClient(supabaseUrl, supabaseAnonKey)
      await memberClient.auth.signInWithPassword({
        email: 'member@test.com',
        password: 'password123'
      })

      const { data, error } = await memberClient
        .from('team_members')
        .select()
        .eq('team_id', testTeamId)

      expect(error).toBeNull()
      expect(data?.length).toBeGreaterThan(0)
    })
  })

  describe('audit_logs RLS', () => {
    it('should allow team members to view audit logs', async () => {
      // First create an audit log entry
      await adminClient.from('audit_logs').insert({
        team_id: testTeamId,
        actor_user_id: ownerUserId,
        action: 'test_action',
        metadata: {}
      })

      const memberClient = createClient(supabaseUrl, supabaseAnonKey)
      await memberClient.auth.signInWithPassword({
        email: 'member@test.com',
        password: 'password123'
      })

      const { data, error } = await memberClient
        .from('audit_logs')
        .select()
        .eq('team_id', testTeamId)

      expect(error).toBeNull()
      expect(data?.length).toBeGreaterThan(0)
    })

    it('should block outsider from viewing team audit logs', async () => {
      const outsiderClient = createClient(supabaseUrl, supabaseAnonKey)
      await outsiderClient.auth.signInWithPassword({
        email: 'outsider@test.com',
        password: 'password123'
      })

      const { data } = await outsiderClient
        .from('audit_logs')
        .select()
        .eq('team_id', testTeamId)

      expect(data).toEqual([])
    })
  })
})

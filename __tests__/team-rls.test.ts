/**
 * Team RLS Policy Tests
 * 
 * Tests Row Level Security policies for team_members, team_invites, and audit_logs tables.
 * Ensures owners/admins can perform actions within their team and others are blocked.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

describe('Team RLS Policies', () => {
  let testTeamId: string
  let ownerUserId: string
  let memberUserId: string
  let outsiderUserId: string
  
  beforeAll(async () => {
    // Create test users and team
    const { data: owner } = await adminClient.auth.admin.createUser({
      email: 'owner@test.com',
      password: 'password123',
      email_confirm: true
    })
    ownerUserId = owner?.user?.id!

    const { data: member } = await adminClient.auth.admin.createUser({
      email: 'member@test.com',
      password: 'password123',
      email_confirm: true
    })
    memberUserId = member?.user?.id!

    const { data: outsider } = await adminClient.auth.admin.createUser({
      email: 'outsider@test.com',
      password: 'password123',
      email_confirm: true
    })
    outsiderUserId = outsider?.user?.id!

    // Create test team
    const { data: team } = await adminClient
      .from('teams')
      .insert({ name: 'Test Team', created_by: ownerUserId })
      .select()
      .single()
    testTeamId = team?.id!

    // Add owner
    await adminClient
      .from('team_members')
      .insert({ team_id: testTeamId, user_id: ownerUserId, role: 'owner' })

    // Add member
    await adminClient
      .from('team_members')
      .insert({ team_id: testTeamId, user_id: memberUserId, role: 'member' })
  })

  afterAll(async () => {
    // Cleanup
    await adminClient.from('team_members').delete().eq('team_id', testTeamId)
    await adminClient.from('teams').delete().eq('id', testTeamId)
    await adminClient.auth.admin.deleteUser(ownerUserId)
    await adminClient.auth.admin.deleteUser(memberUserId)
    await adminClient.auth.admin.deleteUser(outsiderUserId)
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

      // Revert
      await adminClient
        .from('team_members')
        .update({ role: 'member' })
        .eq('team_id', testTeamId)
        .eq('user_id', memberUserId)
    })

    it('should block member from updating roles', async () => {
      const memberClient = createClient(supabaseUrl, supabaseAnonKey)
      await memberClient.auth.signInWithPassword({
        email: 'member@test.com',
        password: 'password123'
      })

      const { error } = await memberClient
        .from('team_members')
        .update({ role: 'admin' })
        .eq('team_id', testTeamId)
        .eq('user_id', memberUserId)

      expect(error).not.toBeNull()
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


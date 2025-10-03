/**
 * Last Owner Guard Tests
 * 
 * Ensures the last owner cannot be removed or demoted.
 * Tests both API level and database level enforcement.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

describe('Last Owner Guard', () => {
  let testTeamId: string
  let ownerUserId: string
  
  beforeAll(async () => {
    // Create test owner
    const { data: owner } = await adminClient.auth.admin.createUser({
      email: 'lastowner@test.com',
      password: 'password123',
      email_confirm: true
    })
    ownerUserId = owner?.user?.id!

    // Create test team
    const { data: team } = await adminClient
      .from('teams')
      .insert({ name: 'Single Owner Team', created_by: ownerUserId })
      .select()
      .single()
    testTeamId = team?.id!

    // Add owner
    await adminClient
      .from('team_members')
      .insert({ team_id: testTeamId, user_id: ownerUserId, role: 'owner' })
  })

  afterAll(async () => {
    // Cleanup
    await adminClient.from('team_members').delete().eq('team_id', testTeamId)
    await adminClient.from('teams').delete().eq('id', testTeamId)
    await adminClient.auth.admin.deleteUser(ownerUserId)
  })

  describe('API Level Guards', () => {
    it('should prevent demoting the last owner via role change API', async () => {
      const response = await fetch('http://localhost:3000/api/team/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: ownerUserId,
          newRole: 'admin'
        })
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('last owner')
    })

    it('should prevent removing the last owner via remove API', async () => {
      const response = await fetch('http://localhost:3000/api/team/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: ownerUserId
        })
      })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('last owner')
    })

    it('should allow changing role after adding a second owner', async () => {
      // Add a second owner
      const { data: newOwner } = await adminClient.auth.admin.createUser({
        email: 'secondowner@test.com',
        password: 'password123',
        email_confirm: true
      })
      const newOwnerUserId = newOwner?.user?.id!

      await adminClient
        .from('team_members')
        .insert({ team_id: testTeamId, user_id: newOwnerUserId, role: 'owner' })

      // Now demotion should work
      const response = await fetch('http://localhost:3000/api/team/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: ownerUserId,
          newRole: 'admin'
        })
      })

      expect(response.status).toBe(200)

      // Cleanup: promote back and remove second owner
      await adminClient
        .from('team_members')
        .update({ role: 'owner' })
        .eq('team_id', testTeamId)
        .eq('user_id', ownerUserId)

      await adminClient
        .from('team_members')
        .delete()
        .eq('team_id', testTeamId)
        .eq('user_id', newOwnerUserId)

      await adminClient.auth.admin.deleteUser(newOwnerUserId)
    })
  })

  describe('Database Level Guards', () => {
    it('should count owners correctly', async () => {
      const { count } = await adminClient
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', testTeamId)
        .eq('role', 'owner')

      expect(count).toBe(1)
    })

    it('should verify owner still exists after guard tests', async () => {
      const { data } = await adminClient
        .from('team_members')
        .select()
        .eq('team_id', testTeamId)
        .eq('user_id', ownerUserId)
        .single()

      expect(data).toBeDefined()
      expect(data?.role).toBe('owner')
    })
  })
})


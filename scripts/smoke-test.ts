import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/app/types/database'
import { randomUUID } from 'crypto'
import { config } from 'dotenv'

// Load environment variables from .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient<Database>(supabaseUrl, supabaseKey)

async function testGitHubSignup() {
  console.log('Testing GitHub signup...')
  const testUser = {
    id: randomUUID(),
    github_id: randomUUID(),
    email: `test+${randomUUID()}@example.com`,
    name: 'Test User',
    avatar_url: 'https://example.com/avatar.png'
  }

  // First create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: testUser.email,
    email_confirm: true,
    user_metadata: {
      name: testUser.name,
      avatar_url: testUser.avatar_url
    }
  })

  if (authError) throw authError

  // Then create user record with referral code
  const { data: user, error } = await supabase
    .from('users')
    .upsert({
      ...testUser,
      id: authUser.user.id,
      referral_code: randomUUID()
    })
    .select()
    .single()

  if (error) throw error
  console.log('✅ User created:', user.id)
  return user
}

async function testTeamCreation(userId: string) {
  console.log('Testing team creation...')
  const team1 = {
    name: 'Test Team 1',
    created_by: userId
  }

  const team2 = {
    name: 'Test Team 2',
    created_by: userId
  }

  const { data: teams, error } = await supabase
    .from('teams')
    .insert([team1, team2])
    .select()

  if (error) throw error
  console.log('✅ Teams created:', teams.map(t => t.id).join(', '))
  return teams
}

async function testReferralFlow(referrerId: string) {
  console.log('Testing referral flow...')
  
  // Get referrer's referral code
  const { data: referrer } = await supabase
    .from('users')
    .select('referral_code')
    .eq('id', referrerId)
    .single()

  if (!referrer?.referral_code) throw new Error('Referrer has no referral code')
  
  console.log('Using referral code:', referrer.referral_code)

  // Create referred user
  const referredUser = {
    id: randomUUID(),
    github_id: randomUUID(),
    email: `referred+${randomUUID()}@example.com`,
    name: 'Referred User',
    avatar_url: 'https://example.com/avatar2.png',
    referred_by: referrer.referral_code,
    referral_code: randomUUID()
  }

  // Create auth user first
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: referredUser.email,
    email_confirm: true,
    user_metadata: {
      name: referredUser.name,
      avatar_url: referredUser.avatar_url
    }
  })

  if (authError) throw authError

  // Create user record without referral first
  const { data: user, error: userError } = await supabase
    .from('users')
    .upsert({
      id: authUser.user.id,
      github_id: referredUser.github_id,
      email: referredUser.email,
      name: referredUser.name,
      avatar_url: referredUser.avatar_url,
      referral_code: referredUser.referral_code
    })
    .select()
    .single()

  if (userError) throw userError

  // Now update with referral
  const { error } = await supabase.rpc('update_user_referral', {
    p_user_id: user.id,
    p_referral_code: referrer.referral_code
  })

  if (error) throw error

  // Wait a bit for the trigger to run
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Check referral credits
  const { data: updatedReferrer } = await supabase
    .from('users')
    .select('referral_credits')
    .eq('id', referrerId)
    .single()

  if (updatedReferrer?.referral_credits !== 1) {
    throw new Error('Referral credits not updated')
  }

  console.log('✅ Referral flow completed')
  return user
}

async function testScanVisibility(userId: string, teamId: string) {
  console.log('Testing scan visibility...')
  const site = {
    url: 'https://example.com',
    team_id: teamId
  }

  // Create site
  const { data: siteData, error: siteError } = await supabase
    .from('sites')
    .insert(site)
    .select()
    .single()

  if (siteError) throw siteError

  // Create public scan
  const publicScan = {
    site_id: siteData.id,
    user_id: userId,
    status: 'completed',
    public: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Create private scan
  const privateScan = {
    site_id: siteData.id,
    user_id: userId,
    status: 'completed',
    public: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: scans, error: scanError } = await supabase
    .from('scans')
    .insert([publicScan, privateScan])
    .select()

  if (scanError) throw scanError

  // Test RLS using service role client
  const { data: teamScans } = await supabase
    .from('scans')
    .select()
    .eq('site_id', siteData.id)

  if (teamScans?.length !== 2) {
    throw new Error('Team member cannot see all scans')
  }

  // Test public access using anon key
  const publicClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  // Should only see public scan
  const { data: publicScans } = await publicClient
    .from('scans')
    .select()
    .eq('site_id', siteData.id)

  if (publicScans?.length !== 1 || !publicScans[0].public) {
    throw new Error('Public visibility not working')
  }

  console.log('✅ Scan visibility tests passed')
}

async function testMonitoring(teamId: string, userId: string) {
  console.log('Testing monitoring...')
  const site = {
    url: 'https://example.com',
    team_id: teamId,
    monitoring_enabled: true,
    monitoring_frequency: 'daily'
  }

  // Create site with monitoring
  const { data: siteData, error: siteError } = await supabase
    .from('sites')
    .insert(site)
    .select()
    .single()

  if (siteError) throw siteError

  // Create scan metrics
  const scan = {
    site_id: siteData.id,
    user_id: userId,
    status: 'completed',
    total_violations: 5,
    passes: 10,
    incomplete: 2,
    inapplicable: 1,
    scan_time_ms: 1000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data: scanData, error: scanError } = await supabase
    .from('scans')
    .insert(scan)
    .select()
    .single()

  if (scanError) throw scanError

  // Update scan record
  const { error: updateError } = await supabase.rpc('update_scan_record', {
    p_scan_id: scanData.id,
    p_status: 'completed',
    p_finished_at: new Date().toISOString(),
    p_total_violations: 5,
    p_passes: 10,
    p_incomplete: 2,
    p_inapplicable: 1,
    p_scan_time_ms: 1000
  })

  if (updateError) throw updateError

  console.log('✅ Monitoring tests passed')
}

async function runTests() {
  try {
    // Test 1: GitHub signup
    const user = await testGitHubSignup()

    // Test 2: Team creation
    const teams = await testTeamCreation(user.id)

    // Test 3: Referral flow
    await testReferralFlow(user.id)

    // Test 4: Scan visibility
    await testScanVisibility(user.id, teams[0].id)

    // Test 5: Monitoring
    await testMonitoring(teams[0].id, user.id)

    console.log('\n🎉 All smoke tests passed!')
  } catch (error) {
    console.error('\n❌ Smoke tests failed:', error)
    process.exit(1)
  }
}

runTests()
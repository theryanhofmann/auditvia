import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables. Please check .env.local')
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function run() {
  try {
    // Get current user from auth token
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN
    if (!accessToken) {
      throw new Error(
        'Please set SUPABASE_ACCESS_TOKEN environment variable\n' +
        'You can get it from your browser dev tools under Application > Local Storage > sb-{project-ref}-auth-token'
      )
    }

    // Get user data using the access token
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken)
    if (userError || !user) {
      throw new Error(`Failed to get user: ${userError?.message || 'User not found'}`)
    }

    // Get user's database ID from the users table
    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .select('id')
      .eq('github_id', user.id)
      .single()

    if (dbUserError || !dbUser) {
      throw new Error(`Failed to get database user: ${dbUserError?.message || 'User not found'}`)
    }

    // Check if user already has a team
    const { data: existingTeams } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', dbUser.id)

    if (existingTeams && existingTeams.length > 0) {
      console.log('User already has a team, skipping setup')
      return
    }

    // Create new team
    const teamId = randomUUID()
    const { error: teamError } = await supabase
      .from('teams')
      .insert({
        id: teamId,
        name: 'My First Team',
        created_by: dbUser.id
      })

    if (teamError) {
      throw new Error(`Failed to create team: ${teamError.message}`)
    }

    // Add user as team owner
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        id: randomUUID(),
        team_id: teamId,
        user_id: dbUser.id,
        role: 'owner'
      })

    if (memberError) {
      throw new Error(`Failed to add team member: ${memberError.message}`)
    }

    console.log('Successfully created team and added user as owner!')
    console.log('Team ID:', teamId)
    console.log('User ID:', dbUser.id)

  } catch (error) {
    console.error('Setup failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Run the script if called directly
if (require.main === module) {
  run()
} 
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { PagesTableClient } from './PagesTableClient'

export default async function PagesPage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const userId = session.user.id

  // Get user's current team
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .single()

  if (!membership?.team_id) {
    redirect('/dashboard')
  }

  return <PagesTableClient teamId={membership.team_id} />
}

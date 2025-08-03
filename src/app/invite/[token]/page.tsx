import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'

interface RouteParams {
  params: {
    token: string
  }
}

export default async function AcceptInvitePage({ params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/invite/' + params.token)
  }

  const supabase = await createClient()

  // Get invite details
  const { data: invite, error: inviteError } = await supabase
    .from('team_invites')
    .select('team_id, status, expires_at')
    .eq('token', params.token)
    .single()

  if (inviteError || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Invite</h1>
          <p className="text-muted-foreground">
            This invite link is invalid or has expired.
          </p>
        </div>
      </div>
    )
  }

  if (invite.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invite Already Used</h1>
          <p className="text-muted-foreground">
            This invite has already been {invite.status}.
          </p>
        </div>
      </div>
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invite Expired</h1>
          <p className="text-muted-foreground">
            This invite link has expired. Please request a new invite.
          </p>
        </div>
      </div>
    )
  }

  // Accept invite
  const { error: acceptError } = await supabase.rpc('accept_team_invite', {
    p_team_id: invite.team_id,
    p_user_id: session.user.id,
    p_token: params.token
  })

  if (acceptError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-muted-foreground">
            Failed to accept invite. Please try again.
          </p>
        </div>
      </div>
    )
  }

  // Redirect to team page
  redirect(`/dashboard/teams/${invite.team_id}`)
} 
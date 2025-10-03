import { TeamClient } from './TeamClient'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

function TeamLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  )
}

export const metadata = {
  title: 'Team | Auditvia',
  description: 'Manage team members, roles, and invitations'
}

export default function TeamPage() {
  return (
    <Suspense fallback={<TeamLoading />}>
      <TeamClient />
    </Suspense>
  )
}


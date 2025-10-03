import { Suspense } from 'react'
import { AcceptInviteClient } from './AcceptInviteClient'

export const metadata = {
  title: 'Accept Team Invitation | Auditvia',
  description: 'Accept your team invitation to join Auditvia'
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AcceptInviteClient />
    </Suspense>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying invitation...</h2>
        <p className="text-gray-600">Please wait while we process your invitation.</p>
      </div>
    </div>
  )
}


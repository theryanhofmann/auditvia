'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'

export function AcceptInviteClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [teamName, setTeamName] = useState('')

  useEffect(() => {
    async function acceptInvite() {
      if (!token) {
        setState('error')
        setMessage('No invitation token provided. Please use the link from your invitation email.')
        return
      }

      try {
        const response = await fetch('/api/team/invite/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        const data = await response.json()

        if (response.ok) {
          setState('success')
          setMessage(data.message || 'You have successfully joined the team!')
          setTeamName(data.teamName || 'the team')

          // Redirect to team page after 2 seconds
          setTimeout(() => {
            router.push('/dashboard/team?accepted=1')
          }, 2000)
        } else {
          setState('error')
          setMessage(data.error || 'Failed to accept invitation. Please try again.')
        }
      } catch (error) {
        console.error('Error accepting invite:', error)
        setState('error')
        setMessage('An unexpected error occurred. Please try again later.')
      }
    }

    acceptInvite()
  }, [token, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {state === 'loading' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing invitation...</h2>
            <p className="text-gray-600">Please wait while we set up your account.</p>
          </div>
        )}

        {state === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome aboard! 🎉</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900 font-medium">
                You've successfully joined <strong>{teamName}</strong>
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/team')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Go to Team Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-gray-500 mt-4">Redirecting automatically in 2 seconds...</p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to accept invitation</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </button>
              <a
                href="mailto:support@auditvia.com"
                className="block text-sm text-blue-600 hover:text-blue-700"
              >
                Contact support if you need help
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


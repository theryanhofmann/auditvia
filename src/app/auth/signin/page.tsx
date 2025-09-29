'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { toast } from 'sonner'
import { Github } from 'lucide-react'

function SignInForm() {
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')

  const handleSignIn = async () => {
    try {
      setIsLoading(true)
      await signIn('github', { 
        callbackUrl,
        redirect: true
      })
    } catch (error) {
      console.error('Sign in error:', error)
      toast.error('Failed to sign in with GitHub')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Welcome to Auditvia
          </h1>
          <p className="mt-4 text-lg text-zinc-400">
            Sign in to manage your accessibility audits
          </p>
        </div>

        {error && (
          <div className="p-4 text-sm text-red-500 bg-red-950/50 rounded-lg border border-red-900/50">
            {error === 'OAuthSignin' && 'Error starting GitHub sign in'}
            {error === 'OAuthCallback' && 'Error completing GitHub sign in'}
            {error === 'default' && 'Failed to sign in'}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Github className="w-5 h-5" />
          {isLoading ? 'Signing in...' : 'Continue with GitHub'}
        </button>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
        <div className="w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Welcome to Auditvia
            </h1>
            <p className="mt-4 text-lg text-zinc-400">
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
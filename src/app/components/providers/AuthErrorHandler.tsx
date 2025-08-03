'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export function AuthErrorHandler() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (error) {
      switch (error) {
        case 'OAuthSignin':
          toast.error('Error starting GitHub sign in')
          break
        case 'OAuthCallback':
          toast.error('Error completing GitHub sign in')
          break
        case 'AccessDenied':
          toast.error('Access denied by GitHub')
          break
        case 'Verification':
          toast.error('Unable to verify GitHub account')
          break
        default:
          toast.error('Failed to sign in')
      }
    }
  }, [error])

  return null
}
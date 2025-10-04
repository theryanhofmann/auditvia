'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SettingsClient } from './SettingsClient'
import { redirect } from 'next/navigation'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const _router = useRouter()

  // Protect route - redirect to login if not authenticated
  if (status === 'unauthenticated') {
    redirect('/')
  }

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Convert session user to expected type
  const user = session?.user ? {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    pro: session.user.pro || false
  } : null

  return <SettingsClient user={user} />
} 
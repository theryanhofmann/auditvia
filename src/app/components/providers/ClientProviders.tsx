'use client'

import { SessionProvider } from './SessionProvider'
import { TeamProvider } from '../../context/TeamContext'
import { Toaster } from 'sonner'
import { AuthErrorHandler } from './AuthErrorHandler'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import * as React from 'react'

function ReferralToast() {
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user?.referrerName) {
      toast.success(`Welcome! You were referred by ${session.user.referrerName}`, {
        duration: 5000
      })
    }
  }, [session?.user?.referrerName])

  return null
}

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <TeamProvider>
        <ReferralToast />
        <AuthErrorHandler />
        {children}
        <Toaster />
      </TeamProvider>
    </SessionProvider>
  )
}
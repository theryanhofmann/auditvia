import { NotificationsClient } from './NotificationsClient'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

function NotificationsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
    </div>
  )
}

export const metadata = {
  title: 'Notifications | Auditvia',
  description: 'Stay up to date with accessibility compliance events'
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<NotificationsLoading />}>
      <NotificationsClient />
    </Suspense>
  )
}

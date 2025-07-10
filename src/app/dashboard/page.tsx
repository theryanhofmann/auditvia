import DashboardClient from '@/app/components/DashboardClient'
import { Navigation } from '@/app/components/Navigation'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardClient />
      </div>
    </div>
  )
} 
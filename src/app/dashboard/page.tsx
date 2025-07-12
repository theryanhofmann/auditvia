import { DashboardClient } from '@/app/components/DashboardClient'
import { Navigation } from '@/app/components/Navigation'

export default function DashboardPage() {
  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <DashboardClient />
      </main>
    </>
  )
} 
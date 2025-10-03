import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from '@/app/components/dashboard/DashboardSidebar'
import { ConditionalTopNav } from '@/app/components/dashboard/ConditionalTopNav'
import { GlobalAiEngineerWrapper } from '@/app/components/ai/GlobalAiEngineerWrapper'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Left Sidebar */}
      <DashboardSidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation - conditionally hidden for pages with custom headers */}
        <ConditionalTopNav />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-900">
          {children}
        </main>
      </div>
      
      {/* Global AI Engineer - Available everywhere */}
      <GlobalAiEngineerWrapper />
    </div>
  )
}

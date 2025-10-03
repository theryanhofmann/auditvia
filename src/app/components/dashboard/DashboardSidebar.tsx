'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { 
  LayoutDashboard, 
  Zap,
  FileText, 
  Globe, 
  Bell, 
  BarChart3, 
  Settings, 
  Users,
  LogOut
} from 'lucide-react'
import Image from 'next/image'
import { AuditviaLogo } from '@/app/components/AuditviaLogo'

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sites', href: '/dashboard/sites', icon: Globe },
  { name: 'Fix Center', href: '/dashboard/violations', icon: Zap },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Team', href: '/dashboard/team', icon: Users },
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    // Highlight "Sites" when viewing scan reports (since scans are accessed through sites)
    if (href === '/dashboard/sites' && pathname?.startsWith('/dashboard/scans')) {
      return true
    }
    return pathname?.startsWith(href)
  }

  return (
    <aside className="w-64 bg-blue-700 text-white flex flex-col h-full shadow-xl">
      {/* Logo */}
      <div className="p-6 flex items-center justify-center border-b border-blue-600/30">
        <AuditviaLogo variant="white" size="md" href="/dashboard" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                group relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200
                ${active 
                  ? 'bg-white/15 text-white shadow-sm' 
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
              )}
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              <span className="font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-blue-600/30 bg-blue-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 ring-2 ring-white/20 flex items-center justify-center overflow-hidden">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || 'User'}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-white">
                {session?.user?.name?.charAt(0)?.toUpperCase() || 
                 session?.user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {session?.user?.name || 'User'}
            </p>
            <p className="text-xs text-blue-200 truncate">
              Account Settings
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200 group"
            title="Sign out"
          >
            <LogOut className="w-4 h-4 text-blue-200 group-hover:text-white group-hover:scale-110 transition-all" />
          </button>
        </div>
      </div>
    </aside>
  )
}

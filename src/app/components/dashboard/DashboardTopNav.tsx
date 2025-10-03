'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Calendar, Menu, X } from 'lucide-react'

// Page title mapping
const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { 
    title: 'Welcome to Your Compliance Report', 
    subtitle: 'Hello, Sarah!' 
  },
  '/dashboard/violations': { 
    title: 'Welcome to Your Active Violations', 
    subtitle: 'Hello, Sarah!' 
  },
  '/dashboard/reports': { 
    title: 'Accessibility Reports', 
    subtitle: 'View and manage your scan reports' 
  },
  '/dashboard/sites': { 
    title: 'Your Sites', 
    subtitle: 'Manage monitored websites' 
  },
  '/dashboard/settings': { 
    title: 'Settings', 
    subtitle: 'Configure your preferences' 
  },
  '/dashboard/teams': { 
    title: 'Team Management', 
    subtitle: 'Manage your team members and roles' 
  },
}

export function DashboardTopNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Hide top nav for pages with their own headers
  const pagesWithOwnHeaders = ['/dashboard/settings', '/dashboard', '/dashboard/reports', '/dashboard/violations', '/dashboard/sites', '/dashboard/analytics']
  
  // Also hide for scan reports and site-specific pages (dynamic routes)
  if (
    pagesWithOwnHeaders.includes(pathname || '') || 
    pathname?.startsWith('/dashboard/scans/') ||
    pathname?.startsWith('/dashboard/sites/')
  ) {
    return null
  }

  // Get page info
  const getPageInfo = () => {
    // Check for exact matches first
    if (pageTitles[pathname || '']) {
      return pageTitles[pathname || '']
    }
    
    // Check for partial matches (for dynamic routes)
    for (const [path, info] of Object.entries(pageTitles)) {
      if (pathname?.startsWith(path) && path !== '/dashboard') {
        return info
      }
    }
    
    // Default fallback
    return { title: 'Dashboard', subtitle: 'Hello, Sarah!' }
  }

  const { title, subtitle } = getPageInfo()

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-8 py-5">
        <div className="flex items-center justify-between">
          {/* Left: Page Title */}
          <div>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1.5 font-medium">
              <span>{subtitle}</span>
              <span className="text-xl">👋</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              {title}
            </h1>
          </div>

          {/* Right: Time Filter & Actions */}
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2.5 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 shadow-sm">
              <Calendar className="w-4 h-4" />
              <span>This month</span>
              <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden transition-colors">
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

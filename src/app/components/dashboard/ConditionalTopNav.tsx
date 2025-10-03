'use client'

import { usePathname } from 'next/navigation'
import { DashboardTopNav } from './DashboardTopNav'

/**
 * Wrapper component that conditionally renders DashboardTopNav
 * based on the current pathname.
 * 
 * Pages with their own custom headers (Notifications, Violations, Reports, Analytics, Team)
 * don't need the default top nav.
 */
export function ConditionalTopNav() {
  const pathname = usePathname()
  
  // Pages that should hide the top nav (they have their own headers)
  const hideTopNav = pathname?.includes('/notifications') || 
                      pathname?.includes('/violations') ||
                      pathname?.includes('/reports') ||
                      pathname?.includes('/analytics') ||
                      pathname?.includes('/team')

  if (hideTopNav) {
    return null
  }

  return <DashboardTopNav />
}


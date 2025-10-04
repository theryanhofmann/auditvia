'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { UpgradeCTA } from '@/app/components/ui/UpgradeCTA'
import { ProBadge } from '@/app/components/ui/ProBadge'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface UpgradeCTAClientProps {
  scanId: string
}

export function UpgradeCTAClient({ scanId }: UpgradeCTAClientProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (!session?.user.pro) {
      toast.error('Upgrade to Pro to export reports')
      router.push('/settings')
      return
    }

    try {
      setIsExporting(true)
      const response = await fetch(`/api/scans/${scanId}/export`)
      
      if (!response.ok) {
        if (response.status === 403) {
          toast.error('Upgrade to Pro to export reports')
          router.push('/settings')
          return
        }
        throw new Error('Failed to export report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `accessibility-report-${scanId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Report exported successfully')
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="relative">
      {!session?.user.pro && (
        <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-[1px] rounded-lg flex items-center justify-center">
          <ProBadge />
        </div>
      )}
      <UpgradeCTA onExport={handleExport} disabled={!session?.user.pro || isExporting} />
    </div>
  )
} 
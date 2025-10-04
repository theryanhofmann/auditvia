'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { FileDown, Loader2, CheckCircle,  Crown } from 'lucide-react'
import { toast } from 'sonner'
import { useTeam } from '@/app/context/TeamContext'
import { ProFeatureLock } from '@/app/components/ui/ProUpgradeButton'

// Simple cache for team data to avoid repeated API calls
const teamDataCache = new Map<string, any>()

async function getCachedTeamData(teamId: string) {
  // Return cached data if available
  if (teamDataCache.has(teamId)) {
    return teamDataCache.get(teamId)
  }

  // Try to get from localStorage first (for client-side caching)
  const cached = localStorage.getItem(`team_${teamId}`)
  if (cached) {
    try {
      const data = JSON.parse(cached)
      // Check if cache is still fresh (less than 5 minutes old)
      if (Date.now() - data.timestamp < 5 * 60 * 1000) {
        teamDataCache.set(teamId, data.team)
        return data.team
      }
    } catch {
      // Invalid cache, ignore
    }
  }

  return null
}

function setCachedTeamData(teamId: string, teamData: any) {
  teamDataCache.set(teamId, teamData)
  // Also cache in localStorage for persistence across page refreshes
  try {
    localStorage.setItem(`team_${teamId}`, JSON.stringify({
      team: teamData,
      timestamp: Date.now()
    }))
  } catch {
    // localStorage not available or quota exceeded, ignore
  }
}

interface PDFExportButtonProps {
  scanId: string
  siteName?: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

interface PDFJob {
  jobId: string
  status: 'processing' | 'completed' | 'failed'
  downloadUrl?: string
  error?: string
  estimatedTime?: number
}

export function PDFExportButton({ 
  scanId, 
  siteName = 'Report',
  className = '',
  variant = 'outline',
  size = 'default'
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [job, setJob] = useState<PDFJob | null>(null)
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const { teamId } = useTeam()

  // Check Pro status on mount
  useEffect(() => {
    async function checkProStatus() {
      if (!teamId) {
        setIsPro(false)
        return
      }

      try {
        // Use cached team data instead of making API call
        const cachedTeam = await getCachedTeamData(teamId)
        if (cachedTeam) {
          setIsPro(cachedTeam.billing_status === 'pro' || cachedTeam.is_pro === true)
        } else {
          const response = await fetch(`/api/teams/${teamId}`)
          if (response.ok) {
            const team = await response.json()
            setIsPro(team.billing_status === 'pro' || team.is_pro === true)
            setCachedTeamData(teamId, team) // Cache the result
          } else {
            setIsPro(false)
          }
        }
      } catch (error) {
        console.error('Failed to check Pro status:', error)
        setIsPro(false)
      }
    }
    
    checkProStatus()
  }, [teamId])

  const handleExport = async () => {
    if (isPro === null) {
      toast.error('Checking Pro status...')
      return
    }
    
    if (!isPro) {
      toast.error('PDF export requires a Pro plan')
      return
    }

    setIsGenerating(true)
    
    try {
      console.log('📄 [export] Starting PDF export for scan:', scanId)
      
      // Start PDF generation
      const response = await fetch(`/api/scans/${scanId}/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to start PDF generation')
      }

      // If we got a cached PDF, download immediately
      if (data.cached && data.downloadUrl) {
        console.log('📄 [export] Using cached PDF')
        toast.success('PDF ready! Downloading...')
        downloadPDF(data.downloadUrl, siteName)
        return
      }

      // Otherwise, start polling for completion
      const newJob: PDFJob = {
        jobId: data.jobId,
        status: 'processing',
        estimatedTime: data.estimatedTime
      }
      
      setJob(newJob)
      
      const estimatedSeconds = Math.ceil((data.estimatedTime || 10000) / 1000)
      toast.info(`Generating PDF... This may take up to ${estimatedSeconds} seconds`)
      
      // Poll for completion
      pollJobStatus(newJob.jobId)
      
    } catch (error) {
      console.error('📄 [export] Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export PDF')
      setIsGenerating(false)
      setJob(null)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    const maxAttempts = 30 // 30 attempts = ~2 minutes with 4s intervals
    let attempts = 0
    
    const poll = async () => {
      attempts++
      
      try {
        const response = await fetch(`/api/scans/${scanId}/pdf?jobId=${jobId}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to check PDF status')
        }
        
        console.log(`📄 [export] Poll ${attempts}/${maxAttempts}, status: ${data.status}`)
        
        setJob(prev => prev ? { ...prev, status: data.status } : null)
        
        if (data.status === 'completed' && data.downloadUrl) {
          console.log('📄 [export] PDF generation completed')
          toast.success('PDF generated successfully! Downloading...')
          downloadPDF(data.downloadUrl, siteName)
          setIsGenerating(false)
          setJob(null)
          return
        }
        
        if (data.status === 'failed') {
          console.error('📄 [export] PDF generation failed:', data.error)
          toast.error(`PDF generation failed: ${data.error || 'Unknown error'}`)
          setIsGenerating(false)
          setJob(null)
          return
        }
        
        // Continue polling if still processing
        if (data.status === 'processing' && attempts < maxAttempts) {
          setTimeout(poll, 4000) // Poll every 4 seconds
        } else if (attempts >= maxAttempts) {
          console.warn('📄 [export] Polling timeout reached')
          toast.error('PDF generation is taking longer than expected. Please try again.')
          setIsGenerating(false)
          setJob(null)
        }
        
      } catch (error) {
        console.error('📄 [export] Polling error:', error)
        toast.error('Failed to check PDF generation status')
        setIsGenerating(false)
        setJob(null)
      }
    }
    
    // Start polling after a short delay
    setTimeout(poll, 2000)
  }

  const downloadPDF = (url: string, filename: string) => {
    try {
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}-accessibility-report.pdf`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log('📄 [export] ✅ PDF download initiated')
    } catch (error) {
      console.error('📄 [export] Download error:', error)
      toast.error('Failed to download PDF')
    }
  }

  const getButtonContent = () => {
    if (!isPro) {
      return (
        <>
          <Crown className="w-4 h-4 mr-2" />
          Export PDF (Pro)
        </>
      )
    }

    if (isGenerating) {
      if (job?.status === 'processing') {
        return (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating PDF...
          </>
        )
      }
      return (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Starting...
        </>
      )
    }

    return (
      <>
        <FileDown className="w-4 h-4 mr-2" />
        Export PDF
      </>
    )
  }

  const getButtonVariant = () => {
    if (!isPro) return 'outline'
    return variant
  }

  if (!isPro) {
    return (
      <div className="relative">
        <Button
          onClick={handleExport}
          disabled={true}
          variant={getButtonVariant()}
          size={size}
          className={`${className} opacity-60`}
        >
          {getButtonContent()}
        </Button>
        <div className="absolute inset-0 cursor-pointer" onClick={() => {
          toast.error('PDF export requires a Pro plan. Upgrade to access this feature.')
        }} />
      </div>
    )
  }

  return (
    <Button
      onClick={handleExport}
      disabled={isGenerating}
      variant={getButtonVariant()}
      size={size}
      className={className}
    >
      {getButtonContent()}
    </Button>
  )
}

interface PDFExportCardProps {
  scanId: string
  siteName?: string
  className?: string
}

export function PDFExportCard({ scanId, siteName, className = '' }: PDFExportCardProps) {
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const { teamId } = useTeam()

  // Check Pro status on mount
  useEffect(() => {
    async function checkProStatus() {
      if (!teamId) {
        setIsPro(false)
        return
      }
      
      try {
        // Use cached team data instead of making API call
        const cachedTeam = await getCachedTeamData(teamId)
        if (cachedTeam) {
          setIsPro(cachedTeam.billing_status === 'pro' || cachedTeam.is_pro === true)
        } else {
          const response = await fetch(`/api/teams/${teamId}`)
          if (response.ok) {
            const team = await response.json()
            setIsPro(team.billing_status === 'pro' || team.is_pro === true)
            setCachedTeamData(teamId, team) // Cache the result
          } else {
            setIsPro(false)
          }
        }
      } catch (error) {
        console.error('Failed to check Pro status:', error)
        setIsPro(false)
      }
    }

    checkProStatus()
  }, [teamId])

  if (isPro === null) {
    // Loading state
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Checking Pro status...</span>
        </div>
      </div>
    )
  }

  if (!isPro) {
    return (
      <ProFeatureLock
        feature="PDF Export"
        description="Generate professional PDF reports of your accessibility scans with detailed findings and recommendations."
        className={className}
      />
    )
  }

  return (
    <div className={`p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Export PDF Report
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Generate a professional PDF report with detailed accessibility findings, 
            perfect for sharing with stakeholders or including in compliance documentation.
          </p>
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Includes executive summary</span>
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Detailed violation list</span>
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>WCAG references</span>
          </div>
        </div>
        <div className="ml-4">
          <PDFExportButton 
            scanId={scanId} 
            siteName={siteName}
            size="lg"
            variant="default"
          />
        </div>
      </div>
    </div>
  )
}

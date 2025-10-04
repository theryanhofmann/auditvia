'use client'

/**
 * Webflow Connect Button
 * Allows users to connect their Webflow account
 */

import { useState, useEffect } from 'react'
import { Zap, Check, AlertCircle, Loader2 } from 'lucide-react'
import { scanAnalytics } from '@/lib/safe-analytics'

interface WebflowConnectProps {
  teamId: string
  onConnected?: () => void
  variant?: 'button' | 'card'
}

export function WebflowConnect({ teamId, onConnected, variant = 'button' }: WebflowConnectProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking')
  const [isConnecting, setIsConnecting] = useState(false)
  const [_connectionId, setConnectionId] = useState<string | null>(null)

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus()
  }, [teamId])

  // Check for success/error params in URL (after OAuth redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    
    if (params.get('success') === 'webflow_connected') {
      setStatus('connected')
      onConnected?.()
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    if (params.get('error')?.startsWith('webflow_')) {
      setStatus('error')
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(`/api/integrations/webflow/status?teamId=${teamId}`)
      const data = await response.json()

      if (data.connected && data.connection) {
        setStatus('connected')
        setConnectionId(data.connection.id)
      } else {
        setStatus('disconnected')
      }
    } catch (error) {
      console.error('Failed to check Webflow status:', error)
      setStatus('error')
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    
    await scanAnalytics.track('platform_connect_initiated', {
      platform: 'webflow',
      team_id: teamId
    })

    // Redirect to OAuth flow
    window.location.href = `/api/integrations/webflow/connect?teamId=${teamId}`
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Webflow? Auto-fix features will be disabled.')) {
      return
    }

    try {
      const response = await fetch('/api/integrations/webflow/status', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      })

      if (response.ok) {
        setStatus('disconnected')
        setConnectionId(null)
        
        await scanAnalytics.track('platform_disconnected', {
          platform: 'webflow',
          team_id: teamId
        })
      }
    } catch (error) {
      console.error('Failed to disconnect Webflow:', error)
    }
  }

  if (status === 'checking') {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking connection...</span>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className="border border-slate-200 rounded-lg p-6 bg-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Webflow</h3>
              <p className="text-sm text-slate-500">
                {status === 'connected' ? 'Connected' : 'Not connected'}
              </p>
            </div>
          </div>
          {status === 'connected' && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-sm">
              <Check className="w-3.5 h-3.5" />
              <span>Active</span>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-600 mb-4">
          {status === 'connected' 
            ? 'Your Webflow account is connected. You can now use one-click fixes for your sites.'
            : 'Connect your Webflow account to enable auto-fix features and apply accessibility improvements with one click.'}
        </p>

        {status === 'connected' ? (
          <button
            onClick={handleDisconnect}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Connect Webflow</span>
              </>
            )}
          </button>
        )}

        {status === 'error' && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Connection failed</p>
              <p className="text-red-700">Please try again or contact support if the issue persists.</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Button variant
  if (status === 'connected') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50 text-green-700 text-sm">
        <Check className="w-3.5 h-3.5" />
        <span>Webflow Connected</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
    >
      {isConnecting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <Zap className="w-4 h-4" />
          <span>Connect Webflow</span>
        </>
      )}
    </button>
  )
}


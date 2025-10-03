'use client'

import { useState, useEffect } from 'react'
import { X, Scale, DollarSign, AlertCircle } from 'lucide-react'

interface Notification {
  id: string
  message: string
  icon: React.ReactNode
  link?: string
}

const NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    message: 'Target settled ADA lawsuit for $3.6M in 2024. Average lawsuit costs exceed $50k.',
    icon: <Scale className="w-5 h-5 text-amber-400" />,
    link: 'https://www.ada.gov/enforcement/'
  },
  {
    id: '2',
    message: '420+ ADA website lawsuits filed in federal courts in Q1 2024 alone.',
    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    link: 'https://www.ada.gov/enforcement/'
  },
  {
    id: '3',
    message: 'Domino\'s Pizza paid $4M+ in legal fees fighting accessibility case (ultimately lost).',
    icon: <DollarSign className="w-5 h-5 text-orange-600" />,
    link: 'https://www.supremecourt.gov/opinions/19pdf/18-1539_ted4.pdf'
  },
  {
    id: '4',
    message: 'DOJ requires WCAG 2.1 Level AA compliance for state/local government websites.',
    icon: <Scale className="w-5 h-5 text-blue-600" />,
    link: 'https://www.ada.gov/resources/web-guidance/'
  },
  {
    id: '5',
    message: '96% of the top 1M websites have detectable WCAG failures (WebAIM 2024).',
    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
    link: 'https://webaim.org/projects/million/'
  }
]

export function SocialProofNotifications() {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hasShownThisSession, setHasShownThisSession] = useState(false)

  useEffect(() => {
    // Check if already shown this session
    const sessionKey = 'auditvia_social_proof_shown'
    const shown = sessionStorage.getItem(sessionKey)
    
    if (shown === 'true') {
      setHasShownThisSession(true)
      return
    }

    // Show first notification after 10 seconds
    const showTimer = setTimeout(() => {
      const randomNotification = NOTIFICATIONS[Math.floor(Math.random() * NOTIFICATIONS.length)]
      setCurrentNotification(randomNotification)
      setIsVisible(true)
      sessionStorage.setItem(sessionKey, 'true')
      setHasShownThisSession(true)

      // Auto-hide after 12 seconds
      const hideTimer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => setCurrentNotification(null), 300) // Wait for fade-out
      }, 12000)

      return () => clearTimeout(hideTimer)
    }, 10000)

    return () => clearTimeout(showTimer)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => setCurrentNotification(null), 300)
  }

  if (!currentNotification || hasShownThisSession) {
    return null
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 border border-gray-200 rounded-lg shadow-2xl p-4 max-w-sm backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center border border-gray-300">
            {currentNotification.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 leading-relaxed">
              {currentNotification.message}
            </p>
            {currentNotification.link && (
              <a
                href={currentNotification.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-300 transition-colors"
              >
                Learn more →
              </a>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-gray-700 flex items-center justify-center transition-colors group"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-[slideOut_12s_linear]"
            style={{
              animation: 'slideOut 12s linear forwards'
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes slideOut {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Share2Icon, CheckIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface ShareButtonProps {
  url: string
  className?: string
}

export function ShareButton({ url, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Report URL copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy URL')
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={copyToClipboard}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
      aria-label="Share report"
    >
      {copied ? (
        <>
          <CheckIcon className="h-4 w-4" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Share2Icon className="h-4 w-4" />
          <span>Share Report</span>
        </>
      )}
    </button>
  )
} 
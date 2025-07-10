import Link from 'next/link'
import { FileX2Icon } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full px-4 py-8 text-center">
        <div className="flex justify-center">
          <FileX2Icon className="h-16 w-16 text-gray-400 dark:text-gray-500" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Report Not Found
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          The accessibility report you're looking for doesn't exist or hasn't completed yet.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  )
} 
'use client'

interface SchemaErrorPageProps {
  errorCode: string
}

export function SchemaErrorPage({ errorCode }: SchemaErrorPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold mb-4 text-red-600">Database Schema Error</h1>
        <p className="text-xl mb-4">The database schema cache needs to be refreshed.</p>
        <p className="text-sm text-gray-600 mb-8">
          Try refreshing the page. If this persists, restart the development server or run database migrations.
        </p>
        <div className="space-y-2">
          <button 
            onClick={() => window.location.reload()} 
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-2"
          >
            Refresh Page
          </button>
          <a href="/dashboard" className="block px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Back to Dashboard
          </a>
          <p className="text-xs text-gray-500">Error Code: {errorCode} - Schema cache issue</p>
        </div>
      </div>
    </div>
  )
}

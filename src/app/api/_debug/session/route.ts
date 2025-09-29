import { NextResponse } from 'next/server'
import { auth } from '@/auth'

// Force Node.js runtime for NextAuth session support
export const runtime = 'nodejs'

/**
 * Debug route for troubleshooting session authentication
 * Only available in development
 */
export async function GET(): Promise<NextResponse> {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    const session = await auth()
    
    return NextResponse.json({
      session: !!session,
      user: session?.user?.email ?? null,
      userId: session?.user?.id ?? null,
      expires: session?.expires ?? null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in debug session route:', error)
    return NextResponse.json(
      { 
        session: false,
        error: 'Session read failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

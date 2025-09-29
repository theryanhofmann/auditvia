import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export default async function DebugSession() {
  if (process.env.NODE_ENV === 'production') {
    redirect('/')
  }

  const session = await getServerSession(authOptions)

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Session</h1>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
        {JSON.stringify(session, null, 2)}
      </pre>
    </div>
  )
}

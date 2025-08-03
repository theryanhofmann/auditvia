import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'
import { requirePro } from '@/app/lib/middleware/requirePro'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { siteId: string } }
) {
  // Check Pro access
  const proCheck = await requirePro(request)
  if (proCheck) return proCheck

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 }
    )
  }

  try {
    const { enabled } = await request.json()

    const supabase = await createClient()

    // Verify site ownership
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('user_id')
      .eq('id', params.siteId)
      .single()

    if (siteError || !site) {
      return new NextResponse(
        JSON.stringify({ error: 'Site not found' }),
        { status: 404 }
      )
    }

    if (site.user_id !== session.user.id) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403 }
      )
    }

    // Update monitoring status
    const { error: updateError } = await supabase
      .from('sites')
      .update({ monitoring_enabled: enabled })
      .eq('id', params.siteId)

    if (updateError) {
      console.error('Error updating monitoring:', updateError)
      return new NextResponse(
        JSON.stringify({ error: 'Failed to update monitoring status' }),
        { status: 500 }
      )
    }

    return new NextResponse(
      JSON.stringify({ success: true, monitoring_enabled: enabled }),
      { status: 200 }
    )
  } catch (error) {
    console.error('Error processing monitoring update:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400 }
    )
  }
} 
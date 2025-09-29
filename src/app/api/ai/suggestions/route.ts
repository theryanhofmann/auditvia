import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/app/types/database'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null

const SYSTEM_PROMPT = `You are an accessibility expert analyzing WCAG violations. 
Provide clear, actionable advice for fixing accessibility issues.
Focus on high-impact changes that will improve the site's compliance score.
Be specific but use plain language that non-technical users can understand.
Format your response in JSON with three sections:
1. summary: Brief overview of the top 3 most critical issues
2. fixes: List of 3-5 specific actions to take
3. impact: Estimated score improvement (as a number 1-100) if all fixes are implemented`

export async function POST(request: Request) {
  try {
    // Check if OpenAI is available
    if (!openai) {
      return NextResponse.json({ 
        error: 'AI suggestions are not available. OpenAI API key is not configured.' 
      }, { status: 503 })
    }

    // Check auth and Pro status
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: user } = await supabase
      .from('users')
      .select('pro')
      .eq('id', session.user.id)
      .single()

    if (!user?.pro) {
      return new NextResponse('Pro subscription required', { status: 403 })
    }

    // Get violations from request
    const { violations, url } = await request.json()

    if (!violations || !Array.isArray(violations)) {
      return new NextResponse('Invalid request body', { status: 400 })
    }

    // Format violations for GPT
    const formattedViolations = violations.map(v => ({
      rule: v.rule,
      impact: v.impact,
      description: v.description,
      count: v.instances?.length || 1
    }))

    // Get AI suggestions
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            url,
            violations: formattedViolations
          })
        }
      ],
      response_format: { type: 'json_object' }
    })

    const content = completion.choices[0].message.content
    if (!content) {
      throw new Error('No content received from OpenAI')
    }

    const suggestions = JSON.parse(content)

    // Log usage for analytics
    await supabase
      .from('ai_suggestions_log')
      .insert({
        user_id: session.user.id,
        url,
        violation_count: violations.length,
        suggestions
      })
      .select()

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
} 
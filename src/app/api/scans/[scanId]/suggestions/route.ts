import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createClient } from '@/app/lib/supabase/server'
import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null

const SYSTEM_PROMPT = `You are an accessibility expert helping developers fix WCAG violations. For each issue:
1. Explain the problem in plain language
2. Suggest specific code fixes
3. Explain why this matters for users
4. Link to relevant WCAG guidelines

Format your response as a JSON array of objects with these fields:
{
  "rule": "string (the WCAG rule ID)",
  "impact": "string (critical, serious, moderate, minor)",
  "problem": "string (plain language explanation)",
  "solution": "string (specific code fix)",
  "userImpact": "string (why this matters)",
  "wcagLink": "string (URL to guideline)"
}`

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    // Check if OpenAI is available
    if (!openai) {
      return NextResponse.json({ 
        error: 'AI suggestions are not available. OpenAI API key is not configured.' 
      }, { status: 503 })
    }

    // 1. Verify authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Initialize Supabase client
    const supabase = await createClient()

    // 3. Check if suggestions already exist
    const { data: existing } = await supabase
      .rpc('get_scan_suggestions', { scan_id: params.scanId })
      .maybeSingle()

    if (existing) {
      return NextResponse.json(existing)
    }

    // 4. Get scan issues
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('rule, selector, severity, impact, description, help_url, html')
      .eq('scan_id', params.scanId)

    if (issuesError) {
      console.error('Error fetching issues:', issuesError)
      return NextResponse.json(
        { error: 'Failed to fetch scan issues' },
        { status: 500 }
      )
    }

    if (!issues?.length) {
      return NextResponse.json(
        { error: 'No issues found for this scan' },
        { status: 404 }
      )
    }

    // 5. Generate suggestions using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify(
            issues.map((issue) => ({
              rule: issue.rule,
              impact: issue.impact,
              description: issue.description,
              selector: issue.selector,
              html: issue.html
            }))
          )
        }
      ],
      response_format: { type: 'json_object' }
    })

    const suggestions = JSON.parse(completion.choices[0].message.content || '[]')

    // 6. Store suggestions
    const { data: stored, error: storeError } = await supabase
      .from('ai_suggestions')
      .insert({
        scan_id: params.scanId,
        suggestions
      })
      .select()
      .single()

    if (storeError) {
      console.error('Error storing suggestions:', storeError)
      return NextResponse.json(
        { error: 'Failed to store suggestions' },
        { status: 500 }
      )
    }

    return NextResponse.json(stored)
  } catch (error) {
    console.error('Error in suggestions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
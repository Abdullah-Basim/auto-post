import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContentPipeline } from '@/lib/services/claude-agent'

/**
 * Generate content through the Claude pipeline
 * POST /api/agent/generate-content
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, niche, targetPlatforms } = body

    if (!campaignId || !niche) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignId, niche' },
        { status: 400 }
      )
    }

    // Validate campaign belongs to user
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign || campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Run the content generation pipeline
    const result = await generateContentPipeline({
      campaignId,
      niche,
      targetPlatforms: targetPlatforms || [],
      userId: user.id,
    })

    return NextResponse.json({
      success: true,
      contentPieceId: result.contentPieceId,
      reasoning: result.reasoning,
      message: result.message,
    })
  } catch (error) {
    console.error('[v0] Content generation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Generation failed'
    
    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishToMultiplePlatforms, publishToSinglePlatform } from '@/lib/services/platform-publisher'
import { createAgentLog } from '@/lib/db/queries'

/**
 * Publish content to multiple platforms simultaneously
 * POST /api/platforms/publish-multi
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
    const { contentPieceId, platforms, adaptContent = true } = body

    if (!contentPieceId || !platforms || platforms.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: contentPieceId, platforms' },
        { status: 400 }
      )
    }

    // Fetch content piece
    const { data: contentPiece, error: contentError } = await supabase
      .from('content_pieces')
      .select('*')
      .eq('id', contentPieceId)
      .eq('user_id', user.id)
      .single()

    if (contentError || !contentPiece) {
      return NextResponse.json({ error: 'Content piece not found' }, { status: 404 })
    }

    // Fetch platform credentials for this user
    const { data: credentials, error: credError } = await supabase
      .from('platform_credentials')
      .select('*')
      .eq('user_id', user.id)
      .in('platform_id', platforms)

    if (credError) {
      return NextResponse.json(
        { error: 'Failed to fetch credentials' },
        { status: 500 }
      )
    }

    if (credentials.length === 0) {
      return NextResponse.json(
        { error: 'No credentials found for selected platforms' },
        { status: 400 }
      )
    }

    // Get copywriting data
    const copyData = typeof contentPiece.copywriting === 'string'
      ? JSON.parse(contentPiece.copywriting)
      : contentPiece.copywriting

    const baseText = copyData?.copy || contentPiece.source_topics?.[0] || 'Check this out!'
    const hashtags = copyData?.hashtags?.split(' ') || []

    // Create publish requests
    const publishRequests = credentials.map((cred) => ({
      content: {
        text: baseText,
        hashtags,
        media_urls: contentPiece.creative_assets || [],
      },
      platform: cred.platform_id as 'meta' | 'linkedin' | 'x' | 'tiktok',
      credential: {
        access_token: cred.access_token,
        refresh_token: cred.refresh_token,
        page_id: cred.page_id,
        user_id: cred.user_id,
        instagram_business_account_id: cred.instagram_business_account_id,
        person_id: cred.person_id,
        organization_id: cred.organization_id,
      },
    }))

    // Publish to all platforms
    const results = await publishToMultiplePlatforms(publishRequests)

    // Log publishing action
    await createAgentLog({
      user_id: user.id,
      campaign_id: contentPiece.campaign_id,
      content_piece_id: contentPieceId,
      agent_action: 'content_published_multi',
      log_level: 'info',
      message: `Published content to ${results.filter((r) => r.success).length}/${results.length} platforms`,
      raw_json: {
        publishedPlatforms: results.filter((r) => r.success).map((r) => r.platform),
        failedPlatforms: results.filter((r) => !r.success).map((r) => r.platform),
        totalResults: results.length,
      },
    })

    // Store publish records in database
    for (const result of results) {
      if (result.success) {
        await supabase.from('published_posts').insert({
          user_id: user.id,
          content_piece_id: contentPieceId,
          platform: result.platform,
          post_id: result.post_id,
          post_url: result.post_url,
          published_at: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    })
  } catch (error) {
    console.error('[v0] Multi-platform publish error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Publishing failed'

    return NextResponse.json(
      { error: errorMessage, success: false },
      { status: 500 }
    )
  }
}

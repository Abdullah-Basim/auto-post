import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishToMultiplePlatforms } from '@/lib/services/platform-publisher'

/**
 * POST /api/platforms/publish
 * Publish content to selected platforms
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { scheduled_post_id, platforms, content } = body

    if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json(
        { error: 'No platforms selected for publishing' },
        { status: 400 }
      )
    }

    if (!content || typeof content.text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid content provided' },
        { status: 400 }
      )
    }

    // Fetch credentials for selected platforms
    const { data: credentials, error: credError } = await supabase
      .from('platform_credentials')
      .select('*')
      .eq('user_id', user.id)
      .in('platform_id', platforms)

    if (credError) throw credError

    if (!credentials || credentials.length === 0) {
      return NextResponse.json(
        { error: 'No credentials found for selected platforms' },
        { status: 400 }
      )
    }

    // Prepare publish requests
    const publishRequests = credentials.map((cred) => ({
      content,
      platform: cred.platform_id as 'meta' | 'linkedin' | 'x' | 'tiktok',
      credential: {
        access_token: cred.access_token,
        refresh_token: cred.refresh_token,
        page_id: cred.page_id,
        person_id: cred.person_id,
        user_id: cred.user_id,
      },
    }))

    // Publish to all platforms
    const results = await publishToMultiplePlatforms(publishRequests)

    // Save results to database
    if (scheduled_post_id) {
      const platforms_data = results.reduce(
        (acc, result) => {
          acc[result.platform] = {
            status: result.success ? 'published' : 'failed',
            post_id: result.post_id,
            post_url: result.post_url,
            error: result.error,
          }
          return acc
        },
        {} as Record<string, any>
      )

      await supabase
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_platforms: platforms_data,
          published_at: new Date().toISOString(),
        })
        .eq('id', scheduled_post_id)
        .eq('user_id', user.id)
    }

    const successCount = results.filter((r) => r.success).length
    const response = {
      total: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[v0] Publish error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publishing failed' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getComments } from '@/lib/db/queries'

/**
 * GET /api/comments
 * Retrieve comments with optional filtering by sentiment
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const sentiment = searchParams.get('sentiment')
    const hasReply = searchParams.get('hasReply')

    const filters = {
      sentiment: sentiment || undefined,
      has_reply: hasReply ? hasReply === 'true' : undefined,
    }

    const comments = await getComments(filters as any)
    return NextResponse.json(comments)
  } catch (error) {
    console.error('[v0] Get comments error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/comments
 * Create a new comment record (for webhook handlers)
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
    const {
      scheduled_post_id,
      platform_id,
      platform_comment_id,
      commenter_name,
      commenter_handle,
      comment_text,
      sentiment,
    } = body

    if (
      !scheduled_post_id ||
      !platform_id ||
      !platform_comment_id ||
      !commenter_name ||
      !comment_text
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { data, error: insertError } = await supabase
      .from('comments')
      .insert([
        {
          user_id: user.id,
          scheduled_post_id,
          platform_id,
          platform_comment_id,
          commenter_name,
          commenter_handle: commenter_handle || null,
          comment_text,
          sentiment: sentiment || 'neutral',
          sentiment_score: 0.5,
          has_reply: false,
          is_archived: false,
        },
      ])
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[v0] Create comment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create comment' },
      { status: 500 }
    )
  }
}

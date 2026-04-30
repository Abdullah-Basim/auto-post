import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateSmartReply, batchGenerateReplies } from '@/lib/services/reply-generator'
import { createReply } from '@/lib/db/queries'

/**
 * Generate smart replies for comments
 * Supports both single and batch processing
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
    const { commentText, commentId, postContext, niche, isBatch = false, comments: batchComments } = body

    if (!commentText && !batchComments) {
      return NextResponse.json(
        { error: 'Missing required fields: commentText or comments (for batch)' },
        { status: 400 }
      )
    }

    let result

    if (isBatch && Array.isArray(batchComments)) {
      // Batch processing
      const batchRequests = batchComments.map((comment: any) => ({
        commentText: comment.text,
        postContext: comment.postContext || postContext,
        niche,
        userId: user.id,
      }))

      const replies = await batchGenerateReplies(batchRequests)
      result = {
        type: 'batch',
        count: replies.length,
        replies: replies.map((r) => r.reply),
      }
    } else {
      // Single comment processing
      const reply = await generateSmartReply({
        commentText,
        postContext,
        niche,
        userId: user.id,
      })

      // Save the reply if commentId is provided
      if (commentId) {
        try {
          const savedReply = await createReply({
            user_id: user.id,
            comment_id: commentId,
            suggested_reply: reply.suggested_reply,
            final_reply: null,
            is_approved: false,
            is_autonomous: false,
            approved_by_user: false,
            platform_reply_id: null,
            posted_at: null,
            status: 'pending',
            error_message: null,
          })

          result = {
            type: 'single',
            reply,
            savedId: savedReply.id,
          }
        } catch (dbError) {
          console.error('[v0] Failed to save reply to database:', dbError)
          result = {
            type: 'single',
            reply,
            warning: 'Reply generated but could not be saved to database',
          }
        }
      } else {
        result = {
          type: 'single',
          reply,
        }
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[v0] Reply generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reply generation failed' },
      { status: 500 }
    )
  }
}

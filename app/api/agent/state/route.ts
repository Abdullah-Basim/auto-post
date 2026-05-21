import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgentState } from '@/lib/db/queries'

/**
 * GET /api/agent/state
 *
 * Returns the user's current AgentState row plus live counts derived from
 * the source tables (content_pieces, scheduled_posts, comments). The stored
 * counters on agent_state are updated as a side effect — they exist for the
 * Brain Status widget so we don't have to re-aggregate on every poll.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Pull live counts in parallel.
    const [contentRes, publishedRes, commentsRes, state] = await Promise.all([
      supabase
        .from('content_pieces')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed'),
      supabase
        .from('scheduled_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'published'),
      supabase
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      getAgentState(),
    ])

    const totalContentGenerated = contentRes.count ?? 0
    const totalPostsPublished = publishedRes.count ?? 0
    const commentsProcessed = commentsRes.count ?? 0

    if (!state) {
      return NextResponse.json({
        current_status: 'idle',
        current_action: null,
        stage_progress: 0,
        total_stages: 5,
        total_content_generated: totalContentGenerated,
        total_posts_published: totalPostsPublished,
        comments_processed: commentsProcessed,
      })
    }

    // Refresh stored counters if they drifted (best-effort, no await blocking).
    if (
      state.total_content_generated !== totalContentGenerated ||
      state.total_posts_published !== totalPostsPublished ||
      state.comments_processed !== commentsProcessed
    ) {
      await supabase
        .from('agent_state')
        .update({
          total_content_generated: totalContentGenerated,
          total_posts_published: totalPostsPublished,
          comments_processed: commentsProcessed,
        })
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      ...state,
      total_content_generated: totalContentGenerated,
      total_posts_published: totalPostsPublished,
      comments_processed: commentsProcessed,
    })
  } catch (error) {
    console.error('[agent/state] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch agent state' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgentState } from '@/lib/db/queries'

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

    const state = await getAgentState()

    if (!state) {
      return NextResponse.json({
        current_status: 'idle',
        current_action: null,
        stage_progress: 0,
        total_stages: 5,
        total_content_generated: 0,
        total_posts_published: 0,
        comments_processed: 0,
      })
    }

    return NextResponse.json(state)
  } catch (error) {
    console.error('[v0] Get agent state error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch agent state' },
      { status: 500 }
    )
  }
}

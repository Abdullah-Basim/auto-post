import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processCommentsForAutonomousReplies, getAutonomyConfig } from '@/lib/services/autonomous-replies'

/**
 * Process comments and generate autonomous replies
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get autonomy config
    const config = await getAutonomyConfig(user.id)

    if (!config.autoReplyPositive && !config.autoReplyQuestions && !config.autoReplyNegative) {
      return NextResponse.json(
        { message: 'Autonomous replies disabled', processed: 0, replies: [], errors: [] },
        { status: 200 }
      )
    }

    // Process comments
    const results = await processCommentsForAutonomousReplies(user.id, config)

    return NextResponse.json(results, { status: 200 })
  } catch (error) {
    console.error('[v0] Autonomy process error:', error)
    return NextResponse.json(
      { error: 'Failed to process autonomous replies' },
      { status: 500 }
    )
  }
}

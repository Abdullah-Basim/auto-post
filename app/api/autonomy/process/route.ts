import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processPendingReplies } from '@/lib/services/autonomous-engine'

/**
 * POST /api/autonomy/process
 * Trigger processing of pending autonomous replies
 * Called periodically by cron job or manually by user
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

    // Get autonomy config
    const { data: config, error: configError } = await supabase
      .from('autonomy_config')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (configError || !config?.enabled) {
      return NextResponse.json(
        { error: 'Autonomy not enabled' },
        { status: 400 }
      )
    }

    // Get pending autonomous replies
    const { data: pendingReplies, error: repliesError } = await supabase
      .from('replies')
      .select(`
        *,
        comment:comments(*)
      `)
      .eq('user_id', user.id)
      .eq('is_autonomous', true)
      .eq('status', 'pending')
      .is('posted_at', null)
      .limit(50)

    if (repliesError) throw repliesError

    if (!pendingReplies || pendingReplies.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No pending replies to process',
      })
    }

    // Get platform credentials for each reply
    const repliesWithCreds = await Promise.all(
      pendingReplies.map(async (reply) => {
        const { data: cred } = await supabase
          .from('platform_credentials')
          .select('*')
          .eq('user_id', user.id)
          .eq('platform_id', reply.comment?.platform_id || 'x')
          .single()

        return {
          ...reply,
          platform_credential: cred,
        }
      })
    )

    // Process replies
    const results = await processPendingReplies(user.id, repliesWithCreds as any, config)

    // Update posted replies in database
    for (const reply of pendingReplies) {
      if (reply.status === 'posted') {
        await supabase
          .from('replies')
          .update({
            status: 'posted',
            posted_at: new Date().toISOString(),
          })
          .eq('id', reply.id)
      }
    }

    return NextResponse.json({
      success: true,
      stats: results,
      message: `Processed ${results.processed} replies: ${results.posted} posted, ${results.failed} failed, ${results.skipped} skipped`,
    })
  } catch (error) {
    console.error('[v0] Process autonomy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Optional: Call this endpoint from a cron job to process replies periodically
 * Example: 0 * * * * (every hour)
 */
export async function GET(request: NextRequest) {
  // Verify this is called from a trusted cron source
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Process all users' pending replies
  try {
    const supabase = await createClient()

    // Get all users with enabled autonomy
    const { data: configs, error: configError } = await supabase
      .from('autonomy_config')
      .select('user_id')
      .eq('enabled', true)

    if (configError) throw configError

    const results = []

    for (const config of configs || []) {
      // Process each user's replies
      const response = await fetch(
        `${request.nextUrl.origin}/api/autonomy/process`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`,
          },
        }
      )

      const result = await response.json()
      results.push({
        user_id: config.user_id,
        ...result,
      })
    }

    return NextResponse.json({
      success: true,
      processed_users: results.length,
      results,
    })
  } catch (error) {
    console.error('[v0] Cron processing error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron processing failed' },
      { status: 500 }
    )
  }
}

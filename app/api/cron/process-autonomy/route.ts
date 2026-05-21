import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAuthorizedCron } from '@/lib/cron/auth'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/process-autonomy
 *
 * For each user with `autonomy_config.enabled = true`, find unanswered comments
 * that match the user's reply policy and enqueue replies. Triggered every 15
 * minutes by Vercel Cron.
 *
 * The actual reply generation + posting lives in the autonomous-engine and
 * autonomous-replies services. This route only does the orchestration and
 * rate-limit accounting.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: configs, error } = await supabase
    .from('autonomy_config')
    .select('user_id, enabled, auto_reply_positive, auto_reply_questions, auto_reply_negative, max_replies_per_hour, max_replies_per_day')
    .eq('enabled', true)
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const summary: Array<Record<string, unknown>> = []

  for (const cfg of configs ?? []) {
    // Count replies posted in last hour & last day to enforce limits.
    const since1h = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [{ count: lastHour }, { count: lastDay }] = await Promise.all([
      supabase
        .from('replies')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', cfg.user_id)
        .eq('is_autonomous', true)
        .gte('posted_at', since1h),
      supabase
        .from('replies')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', cfg.user_id)
        .eq('is_autonomous', true)
        .gte('posted_at', since24h),
    ])

    const remainingHour = Math.max(0, cfg.max_replies_per_hour - (lastHour ?? 0))
    const remainingDay = Math.max(0, cfg.max_replies_per_day - (lastDay ?? 0))
    const budget = Math.min(remainingHour, remainingDay)

    if (budget === 0) {
      summary.push({ user_id: cfg.user_id, processed: 0, reason: 'budget exhausted' })
      continue
    }

    // Build sentiment whitelist from config flags.
    const allowedSentiments: string[] = []
    if (cfg.auto_reply_positive) allowedSentiments.push('positive')
    if (cfg.auto_reply_questions) allowedSentiments.push('question')
    if (cfg.auto_reply_negative) allowedSentiments.push('negative')
    if (allowedSentiments.length === 0) {
      summary.push({ user_id: cfg.user_id, processed: 0, reason: 'no sentiment enabled' })
      continue
    }

    const { data: targets } = await supabase
      .from('comments')
      .select('id')
      .eq('user_id', cfg.user_id)
      .eq('has_reply', false)
      .eq('is_archived', false)
      .in('sentiment', allowedSentiments)
      .order('created_at', { ascending: false })
      .limit(budget)

    summary.push({
      user_id: cfg.user_id,
      eligible: targets?.length ?? 0,
      budget,
    })

    // TODO(next pass): for each target, invoke generateCommentReply, write to
    // replies table with is_autonomous=true and status='pending', then post via
    // platform API and mark posted_at. Skipped here so this route stays
    // observable and idempotent during the initial deploy.
  }

  return NextResponse.json({ users_processed: summary.length, summary })
}

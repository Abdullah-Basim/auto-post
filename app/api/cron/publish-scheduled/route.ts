import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { publishToSinglePlatform } from '@/lib/services/platform-publisher'
import { safeDecrypt } from '@/lib/crypto'
import { isAuthorizedCron } from '@/lib/cron/auth'
import type { PlatformCredential, ScheduledPost } from '@/types'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/publish-scheduled
 *
 * Picks up scheduled_posts where scheduled_publish_at <= now() and status = 'scheduled',
 * publishes each via the appropriate platform adapter, then updates status to
 * 'published' or 'failed' (with retry_count++ until max_retries).
 *
 * Triggered by Vercel Cron every 5 minutes — see vercel.json.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: due, error } = await supabase
    .from('scheduled_posts')
    .select('*, content_pieces(*), platform_credentials(*, platforms(name))')
    .lte('scheduled_publish_at', new Date().toISOString())
    .eq('status', 'scheduled')
    .order('scheduled_publish_at', { ascending: true })
    .limit(25)

  if (error) {
    console.error('[cron/publish] query failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<Record<string, unknown>> = []

  for (const row of due ?? []) {
    const post = row as ScheduledPost & {
      content_pieces: { copywriting: string | null; creative_assets: unknown } | null
      platform_credentials:
        | (PlatformCredential & { platforms: { name: string } | null })
        | null
    }
    const platformName = post.platform_credentials?.platforms?.name as
      | 'meta'
      | 'linkedin'
      | 'x'
      | 'tiktok'
      | undefined

    if (!platformName || !post.platform_credentials) {
      await markFailed(supabase, post.id, 'Missing platform/credential')
      results.push({ id: post.id, status: 'failed', reason: 'missing platform' })
      continue
    }

    await supabase
      .from('scheduled_posts')
      .update({ status: 'publishing' })
      .eq('id', post.id)

    try {
      const credential = {
        ...post.platform_credentials,
        access_token: safeDecrypt(post.platform_credentials.access_token),
      }

      const result = await publishToSinglePlatform({
        content: {
          text: post.platform_adapted_copy || post.content_pieces?.copywriting || '',
        },
        platform: platformName,
        credential,
      })

      if (result.success) {
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            platform_post_id: result.post_id ?? null,
            platform_response: result,
            error_message: null,
          })
          .eq('id', post.id)
        results.push({ id: post.id, status: 'published', post_id: result.post_id })
      } else {
        await retryOrFail(supabase, post, result.error ?? 'Unknown publish error')
        results.push({ id: post.id, status: 'failed', reason: result.error })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await retryOrFail(supabase, post, message)
      results.push({ id: post.id, status: 'failed', reason: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}

async function retryOrFail(
  supabase: ReturnType<typeof createAdminClient>,
  post: ScheduledPost,
  errorMessage: string
) {
  const nextRetry = post.retry_count + 1
  if (nextRetry >= post.max_retries) {
    await markFailed(supabase, post.id, errorMessage)
  } else {
    await supabase
      .from('scheduled_posts')
      .update({
        status: 'scheduled',
        retry_count: nextRetry,
        error_message: errorMessage,
      })
      .eq('id', post.id)
  }
}

async function markFailed(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
  errorMessage: string
) {
  await supabase
    .from('scheduled_posts')
    .update({ status: 'failed', error_message: errorMessage })
    .eq('id', id)
}

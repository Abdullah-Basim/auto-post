import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAuthorizedCron } from '@/lib/cron/auth'
import { safeDecrypt } from '@/lib/crypto'
import type { PlatformCredential } from '@/types'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/sync-comments
 *
 * For each active credential, fetch recent comments from the platform and
 * upsert into `comments`. Triggered by Vercel Cron hourly.
 *
 * NOTE: this duplicates a small amount of logic from /api/comments/sync
 * because the user-facing route runs under RLS while this one runs as service
 * role across all users.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: credentials, error } = await supabase
    .from('platform_credentials')
    .select('*, platforms(name)')
    .eq('is_active', true)
    .limit(500)

  if (error) {
    console.error('[cron/sync-comments] query failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let totalAdded = 0
  const perCred: Array<Record<string, unknown>> = []

  for (const credRow of credentials ?? []) {
    const credential = credRow as PlatformCredential & {
      platforms: { name: string } | null
    }
    const platformName = credential.platforms?.name

    try {
      if (platformName !== 'linkedin') {
        // Other platforms not yet implemented — see /api/comments/sync.
        perCred.push({ credential_id: credential.id, platform: platformName, status: 'skipped' })
        continue
      }

      const accessToken = safeDecrypt(credential.access_token)
      const added = await syncLinkedInCommentsAdmin(
        supabase,
        credential.user_id,
        credential.id,
        credential.platform_id,
        accessToken
      )
      totalAdded += added
      perCred.push({ credential_id: credential.id, platform: platformName, added })

      await supabase
        .from('platform_credentials')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', credential.id)
    } catch (err) {
      console.error('[cron/sync-comments] credential failed:', credential.id, err)
      perCred.push({
        credential_id: credential.id,
        platform: platformName,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({ total_added: totalAdded, per_credential: perCred })
}

interface LinkedInComment {
  id: string
  message?: { text?: string }
  actor?: string
}

async function syncLinkedInCommentsAdmin(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  credentialId: string,
  platformId: string,
  accessToken: string
): Promise<number> {
  const { data: posts } = await supabase
    .from('scheduled_posts')
    .select('platform_post_id')
    .eq('user_id', userId)
    .eq('platform_credential_id', credentialId)
    .not('platform_post_id', 'is', null)
    .order('published_at', { ascending: false })
    .limit(20)

  if (!posts || posts.length === 0) return 0

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202506',
  }

  const rows: Array<Record<string, unknown>> = []
  for (const post of posts) {
    const postUrn = post.platform_post_id as string | null
    if (!postUrn) continue
    const url = `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments?count=50`
    const res = await fetch(url, { headers })
    if (!res.ok) continue
    const payload = (await res.json()) as { elements?: LinkedInComment[] }
    for (const c of payload.elements ?? []) {
      const text = c.message?.text ?? ''
      if (!text) continue
      rows.push({
        user_id: userId,
        platform_id: platformId,
        platform_comment_id: c.id,
        commenter_name: c.actor ?? 'LinkedIn user',
        commenter_handle: c.actor ?? null,
        commenter_avatar_url: null,
        comment_text: text,
        sentiment: 'neutral',
        sentiment_score: 0,
        has_reply: false,
        is_archived: false,
        fetched_at: new Date().toISOString(),
      })
    }
  }

  if (rows.length === 0) return 0

  const { count, error } = await supabase
    .from('comments')
    .upsert(rows, {
      onConflict: 'platform_id,platform_comment_id',
      ignoreDuplicates: true,
      count: 'exact',
    })

  if (error) throw error
  return count ?? rows.length
}

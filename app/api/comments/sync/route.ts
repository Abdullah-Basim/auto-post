import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeDecrypt } from '@/lib/crypto'
import type { PlatformCredential } from '@/types'

/**
 * Sync Comments from Platforms
 * Fetches recent comments from all connected platforms and inserts new ones
 * into the comments table.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      platformIds?: string[]
    }

    let credQuery = supabase
      .from('platform_credentials')
      .select('*, platforms(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (body.platformIds && body.platformIds.length > 0) {
      credQuery = credQuery.in('platform_id', body.platformIds)
    }

    const { data: credentials, error: credError } = await credQuery
    if (credError) throw credError

    const syncResults: Array<Record<string, unknown>> = []
    let totalCommentsSynced = 0

    for (const credentialRow of credentials || []) {
      const credential = credentialRow as PlatformCredential & {
        platforms: { name: string } | null
      }
      const platformName = credential.platforms?.name
      try {
        let comments: SyncedComment[] = []

        switch (platformName) {
          case 'linkedin':
            comments = await syncLinkedInComments(credential, user.id)
            break
          case 'meta':
            comments = await syncMetaComments(credential, user.id)
            break
          case 'x':
            comments = await syncXComments(credential, user.id)
            break
          default:
            comments = []
        }

        if (comments.length > 0) {
          // Upsert by (platform_id, platform_comment_id) — see schema unique constraint.
          const { error: insertError, count } = await supabase
            .from('comments')
            .upsert(comments, {
              onConflict: 'platform_id,platform_comment_id',
              ignoreDuplicates: true,
              count: 'exact',
            })

          if (insertError) throw insertError

          const added = count ?? comments.length
          totalCommentsSynced += added
          syncResults.push({
            platform: platformName,
            count: added,
            status: 'success',
          })
        } else {
          syncResults.push({
            platform: platformName,
            count: 0,
            status: 'empty',
          })
        }

        await supabase
          .from('platform_credentials')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', credential.id)
      } catch (error) {
        console.error(`[comments/sync] ${platformName} failed:`, error)
        syncResults.push({
          platform: platformName ?? credential.platform_id,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return NextResponse.json(
      { syncResults, total: totalCommentsSynced },
      { status: 200 }
    )
  } catch (error) {
    console.error('[comments/sync] fatal:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync comments' },
      { status: 500 }
    )
  }
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

interface SyncedComment {
  user_id: string
  platform_id: string
  platform_comment_id: string
  commenter_name: string
  commenter_handle: string | null
  commenter_avatar_url: string | null
  comment_text: string
  sentiment: 'positive' | 'negative' | 'neutral' | 'question'
  sentiment_score: number
  has_reply: boolean
  is_archived: boolean
  fetched_at: string
}

function quickSentiment(text: string): { sentiment: SyncedComment['sentiment']; score: number } {
  const t = text.toLowerCase()
  if (t.includes('?') && t.length < 200) return { sentiment: 'question', score: 0 }
  const positives = ['love', 'great', 'awesome', 'amazing', 'thank', 'helpful', '🔥', '❤']
  const negatives = ['hate', 'awful', 'terrible', 'bad', 'sucks', 'worst', 'disappointed']
  let score = 0
  for (const w of positives) if (t.includes(w)) score += 1
  for (const w of negatives) if (t.includes(w)) score -= 1
  if (score > 0) return { sentiment: 'positive', score: Math.min(1, score * 0.4) }
  if (score < 0) return { sentiment: 'negative', score: Math.max(-1, score * 0.4) }
  return { sentiment: 'neutral', score: 0 }
}

// ----------------------------------------------------------------------
// LinkedIn
// ----------------------------------------------------------------------

interface LinkedInComment {
  id: string
  message?: { text?: string }
  actor?: string
  created?: { time?: number }
}

async function syncLinkedInComments(
  credential: PlatformCredential,
  userId: string
): Promise<SyncedComment[]> {
  const accessToken = safeDecrypt(credential.access_token)

  // 1. Find recent scheduled_posts for this credential that have a platform_post_id.
  //    Comments are scoped to posts we've actually published.
  const supabase = await createClient()
  const { data: posts, error: postsError } = await supabase
    .from('scheduled_posts')
    .select('platform_post_id')
    .eq('user_id', userId)
    .eq('platform_credential_id', credential.id)
    .not('platform_post_id', 'is', null)
    .order('published_at', { ascending: false })
    .limit(50)

  if (postsError) throw postsError
  if (!posts || posts.length === 0) return []

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202506',
  }

  const out: SyncedComment[] = []
  for (const post of posts) {
    const postUrn = post.platform_post_id as string
    if (!postUrn) continue

    const encoded = encodeURIComponent(postUrn)
    const url = `https://api.linkedin.com/v2/socialActions/${encoded}/comments?count=50`
    const res = await fetch(url, { headers })
    if (!res.ok) {
      // 404 just means no comments / post not visible
      if (res.status !== 404) {
        console.warn('[linkedin/sync] non-OK:', res.status, await res.text())
      }
      continue
    }

    const payload = (await res.json()) as { elements?: LinkedInComment[] }
    for (const c of payload.elements ?? []) {
      const text = c.message?.text ?? ''
      if (!text) continue
      const { sentiment, score } = quickSentiment(text)
      out.push({
        user_id: userId,
        platform_id: credential.platform_id,
        platform_comment_id: c.id,
        commenter_name: c.actor ?? 'LinkedIn user',
        commenter_handle: c.actor ?? null,
        commenter_avatar_url: null,
        comment_text: text,
        sentiment,
        sentiment_score: score,
        has_reply: false,
        is_archived: false,
        fetched_at: new Date().toISOString(),
      })
    }
  }
  return out
}

// ----------------------------------------------------------------------
// Meta (Facebook + Instagram) — TODO until META_APP creds provided
// ----------------------------------------------------------------------

async function syncMetaComments(
  _credential: PlatformCredential,
  _userId: string
): Promise<SyncedComment[]> {
  // Implementation requires:
  //   1. Use Page Access Token to GET /{page-id}/posts (last N posts)
  //   2. For each, GET /{post-id}/comments?fields=id,message,from{name,id,picture}
  //   3. Map to SyncedComment[]
  // Skipped until Meta credentials are available.
  return []
}

// ----------------------------------------------------------------------
// X (Twitter) — TODO; requires paid Basic tier for replies endpoint
// ----------------------------------------------------------------------

async function syncXComments(
  _credential: PlatformCredential,
  _userId: string
): Promise<SyncedComment[]> {
  // GET https://api.twitter.com/2/tweets/search/recent?query=conversation_id:<id>
  // Requires Basic tier ($100/mo). Stub until subscription is in place.
  return []
}

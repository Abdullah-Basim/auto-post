/**
 * Meta Graph API Integration (Facebook, Instagram)
 * Handles posting, comment fetching, and engagement
 */

export interface MetaCredential {
  access_token: string
  page_id: string
  instagram_business_account_id?: string
}

export interface MetaPost {
  id: string
  permalink: string
  message: string
  created_time: string
  likes?: { data: any[] }
  comments?: { data: any[] }
}

export interface MetaComment {
  id: string
  from: { id: string; name: string }
  message: string
  created_time: string
  like_count: number
}

const META_API_BASE = 'https://graph.instagram.com/v18.0'
const FACEBOOK_API_BASE = 'https://graph.facebook.com/v18.0'

/**
 * Post content to Facebook page
 */
export async function postToFacebook(
  credential: MetaCredential,
  content: { message: string; link?: string; picture?: string }
): Promise<{ id: string; post_url: string }> {
  try {
    const params = new URLSearchParams({
      message: content.message,
      access_token: credential.access_token,
    })

    if (content.link) params.append('link', content.link)
    if (content.picture) params.append('picture', content.picture)

    const response = await fetch(
      `${FACEBOOK_API_BASE}/${credential.page_id}/feed?${params.toString()}`,
      { method: 'POST' }
    )

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.statusText}`)
    }

    const data = (await response.json()) as { id: string }

    return {
      id: data.id,
      post_url: `https://facebook.com/${credential.page_id}/posts/${data.id}`,
    }
  } catch (error) {
    console.error('[v0] Facebook post error:', error)
    throw error
  }
}

/**
 * Post content to Instagram (via feed)
 */
export async function postToInstagram(
  credential: MetaCredential,
  content: { caption: string; media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL'; media_url: string }
): Promise<{ id: string; status: string }> {
  try {
    if (!credential.instagram_business_account_id) {
      throw new Error('Instagram Business Account ID not configured')
    }

    const payload = {
      image_url: content.media_url,
      caption: content.caption,
      access_token: credential.access_token,
    }

    const response = await fetch(
      `${META_API_BASE}/${credential.instagram_business_account_id}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.statusText}`)
    }

    const data = (await response.json()) as { id: string }

    // Publish the media
    const publishResponse = await fetch(
      `${META_API_BASE}/${credential.instagram_business_account_id}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: data.id,
          access_token: credential.access_token,
        }),
      }
    )

    if (!publishResponse.ok) {
      throw new Error(`Instagram publish error: ${publishResponse.statusText}`)
    }

    return {
      id: data.id,
      status: 'published',
    }
  } catch (error) {
    console.error('[v0] Instagram post error:', error)
    throw error
  }
}

/**
 * Fetch comments from a Facebook post
 */
export async function fetchFacebookComments(
  credential: MetaCredential,
  postId: string
): Promise<MetaComment[]> {
  try {
    const params = new URLSearchParams({
      fields: 'id,from,message,created_time,like_count',
      access_token: credential.access_token,
    })

    const response = await fetch(
      `${FACEBOOK_API_BASE}/${postId}/comments?${params.toString()}`
    )

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.statusText}`)
    }

    const data = (await response.json()) as { data: MetaComment[] }
    return data.data
  } catch (error) {
    console.error('[v0] Fetch Facebook comments error:', error)
    return []
  }
}

/**
 * Fetch insights/analytics for a post
 */
export async function fetchPostInsights(
  credential: MetaCredential,
  postId: string
): Promise<{
  likes: number
  comments: number
  shares: number
  reaches: number
}> {
  try {
    const params = new URLSearchParams({
      fields: 'engagement,impressions',
      access_token: credential.access_token,
    })

    const response = await fetch(
      `${FACEBOOK_API_BASE}/${postId}/insights?${params.toString()}`
    )

    if (!response.ok) {
      throw new Error(`Insights API error: ${response.statusText}`)
    }

    const data = (await response.json()) as {
      data: Array<{ name: string; values: Array<{ value: number }> }>
    }

    return {
      likes: 0,
      comments: 0,
      shares: 0,
      reaches: data.data[1]?.values[0]?.value || 0,
    }
  } catch (error) {
    console.error('[v0] Fetch insights error:', error)
    return { likes: 0, comments: 0, shares: 0, reaches: 0 }
  }
}

/**
 * Reply to a comment
 */
export async function replyToComment(
  credential: MetaCredential,
  commentId: string,
  message: string
): Promise<{ id: string }> {
  try {
    const payload = {
      message,
      access_token: credential.access_token,
    }

    const response = await fetch(
      `${FACEBOOK_API_BASE}/${commentId}/comments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      throw new Error(`Reply error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[v0] Reply to comment error:', error)
    throw error
  }
}

/**
 * Check token health and validity
 */
export async function checkTokenHealth(credential: MetaCredential): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      access_token: credential.access_token,
      fields: 'id',
    })

    const response = await fetch(`${FACEBOOK_API_BASE}/me?${params.toString()}`)
    return response.ok
  } catch (error) {
    console.error('[v0] Token health check error:', error)
    return false
  }
}

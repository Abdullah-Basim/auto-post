/**
 * X (Twitter) API v2 Integration
 * Handles posting, engagement, and analytics
 */

export interface XCredential {
  access_token: string
  user_id: string
}

export interface XPost {
  id: string
  text: string
  created_at: string
  public_metrics: {
    retweet_count: number
    reply_count: number
    like_count: number
    quote_count: number
  }
}

export interface XComment {
  id: string
  author_id: string
  text: string
  created_at: string
  public_metrics: {
    like_count: number
    reply_count: number
  }
}

const X_API_BASE = 'https://api.twitter.com/2'

/**
 * Create a tweet
 */
export async function postToX(
  credential: XCredential,
  content: { text: string; media_ids?: string[]; reply_to_tweet_id?: string }
): Promise<{ id: string; url: string }> {
  try {
    const payload: any = {
      text: content.text,
    }

    if (content.media_ids && content.media_ids.length > 0) {
      payload.media = {
        media_ids: content.media_ids,
      }
    }

    if (content.reply_to_tweet_id) {
      payload.reply = {
        in_reply_to_tweet_id: content.reply_to_tweet_id,
      }
    }

    const response = await fetch(`${X_API_BASE}/tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credential.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`X API error: ${JSON.stringify(error)}`)
    }

    const data = (await response.json()) as { data: { id: string } }

    return {
      id: data.data.id,
      url: `https://twitter.com/${credential.user_id}/status/${data.data.id}`,
    }
  } catch (error) {
    console.error('[v0] X post error:', error)
    throw error
  }
}

/**
 * Fetch conversation thread replies
 */
export async function fetchTweetReplies(
  credential: XCredential,
  tweetId: string
): Promise<XComment[]> {
  try {
    const params = new URLSearchParams({
      'query': `conversation_id:${tweetId}`,
      'max_results': '100',
      'tweet.fields': 'created_at,author_id,public_metrics',
      'expansions': 'author_id',
    })

    const response = await fetch(`${X_API_BASE}/tweets/search/recent?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${credential.access_token}`,
      },
    })

    if (!response.ok) {
      return []
    }

    const data = (await response.json()) as {
      data?: Array<{ id: string; text: string; created_at: string; public_metrics: any }>
    }

    return (
      data.data?.map((tweet) => ({
        id: tweet.id,
        author_id: '',
        text: tweet.text,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics || {},
      })) || []
    )
  } catch (error) {
    console.error('[v0] Fetch replies error:', error)
    return []
  }
}

/**
 * Get tweet metrics/analytics
 */
export async function fetchTweetMetrics(
  credential: XCredential,
  tweetId: string
): Promise<{ likes: number; retweets: number; replies: number; quotes: number }> {
  try {
    const params = new URLSearchParams({
      'tweet.fields': 'public_metrics',
    })

    const response = await fetch(`${X_API_BASE}/tweets/${tweetId}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${credential.access_token}`,
      },
    })

    if (!response.ok) {
      return { likes: 0, retweets: 0, replies: 0, quotes: 0 }
    }

    const data = (await response.json()) as {
      data: { public_metrics: XPost['public_metrics'] }
    }

    const metrics = data.data.public_metrics

    return {
      likes: metrics.like_count || 0,
      retweets: metrics.retweet_count || 0,
      replies: metrics.reply_count || 0,
      quotes: metrics.quote_count || 0,
    }
  } catch (error) {
    console.error('[v0] Fetch metrics error:', error)
    return { likes: 0, retweets: 0, replies: 0, quotes: 0 }
  }
}

/**
 * Reply to a tweet
 */
export async function replyToTweet(
  credential: XCredential,
  tweetId: string,
  text: string
): Promise<{ id: string; url: string }> {
  try {
    const payload = {
      text,
      reply: {
        in_reply_to_tweet_id: tweetId,
      },
    }

    const response = await fetch(`${X_API_BASE}/tweets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credential.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`X API error: ${response.statusText}`)
    }

    const data = (await response.json()) as { data: { id: string } }

    return {
      id: data.data.id,
      url: `https://twitter.com/${credential.user_id}/status/${data.data.id}`,
    }
  } catch (error) {
    console.error('[v0] Reply error:', error)
    throw error
  }
}

/**
 * Check token validity
 */
export async function checkTokenHealth(credential: XCredential): Promise<boolean> {
  try {
    const response = await fetch(`${X_API_BASE}/tweets/search/recent?max_results=10`, {
      headers: {
        'Authorization': `Bearer ${credential.access_token}`,
      },
    })

    return response.ok
  } catch (error) {
    console.error('[v0] Token check error:', error)
    return false
  }
}

/**
 * LinkedIn API Integration
 * Handles posting, article publishing, and engagement
 */

export interface LinkedInCredential {
  access_token: string
  person_id: string
  organization_id?: string
}

export interface LinkedInPost {
  id: string
  text: string
  created_at: string
  visibility: { 'com.linkedin.ugc.visibility.MemberNetworkVisibility'?: string }
  lifecycleState: string
}

export interface LinkedInComment {
  id: string
  actor: string
  message: string
  created_at: number
}

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2'

/**
 * Post to LinkedIn as a person/creator
 */
export async function postToLinkedIn(
  credential: LinkedInCredential,
  content: { text: string; media?: { type: 'IMAGE' | 'ARTICLE'; url: string }[] }
): Promise<{ id: string; url: string }> {
  try {
    const shareCommentary = {
      text: content.text,
    }

    const visibility = {
      'com.linkedin.ugc.visibility.MemberNetworkVisibility': 'PUBLIC',
    }

    // Build content
    const contentObject: any = {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary,
        shareMediaCategory: content.media ? 'IMAGE' : 'NONE',
        media: content.media
          ? content.media.map((m) => ({
              type: 'com.linkedin.ugc.MediaUploadReference',
              upload: `urn:li:digitalmediaAsset:${m.url}`,
            }))
          : [],
      },
    }

    const payload = {
      author: `urn:li:person:${credential.person_id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: contentObject,
      visibility,
    }

    const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credential.access_token}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202301',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.statusText}`)
    }

    const data = (await response.json()) as any
    const postId = data.id || data

    return {
      id: postId,
      url: `https://www.linkedin.com/feed/update/${postId}`,
    }
  } catch (error) {
    console.error('[v0] LinkedIn post error:', error)
    throw error
  }
}

/**
 * Publish article to LinkedIn
 */
export async function publishLinkedInArticle(
  credential: LinkedInCredential,
  content: { title: string; description: string; content: string; thumbnail?: string }
): Promise<{ id: string; url: string }> {
  try {
    const payload = {
      title: content.title,
      description: content.description,
      content,
      visibility: 'PUBLIC',
    }

    const response = await fetch(`${LINKEDIN_API_BASE}/articles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credential.access_token}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202301',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`Article publish error: ${response.statusText}`)
    }

    const data = (await response.json()) as any

    return {
      id: data.id,
      url: `https://www.linkedin.com/pulse/${data.id}`,
    }
  } catch (error) {
    console.error('[v0] Article publish error:', error)
    throw error
  }
}

/**
 * Fetch post analytics
 */
export async function fetchPostAnalytics(
  credential: LinkedInCredential,
  postId: string
): Promise<{ likes: number; comments: number; shares: number; impressions: number }> {
  try {
    const response = await fetch(
      `${LINKEDIN_API_BASE}/socialMetadata?q=posts&ids=${postId}`,
      {
        headers: {
          'Authorization': `Bearer ${credential.access_token}`,
          'LinkedIn-Version': '202301',
        },
      }
    )

    if (!response.ok) {
      return { likes: 0, comments: 0, shares: 0, impressions: 0 }
    }

    const data = (await response.json()) as any
    const metadata = data.elements?.[0]

    return {
      likes: metadata?.likeCount || 0,
      comments: metadata?.commentCount || 0,
      shares: metadata?.shareCount || 0,
      impressions: metadata?.impressionCount || 0,
    }
  } catch (error) {
    console.error('[v0] Fetch analytics error:', error)
    return { likes: 0, comments: 0, shares: 0, impressions: 0 }
  }
}

/**
 * Check token validity
 */
export async function checkTokenHealth(credential: LinkedInCredential): Promise<boolean> {
  try {
    const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
      headers: {
        'Authorization': `Bearer ${credential.access_token}`,
        'LinkedIn-Version': '202301',
      },
    })

    return response.ok
  } catch (error) {
    console.error('[v0] Token check error:', error)
    return false
  }
}

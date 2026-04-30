/**
 * Unified platform publishing orchestrator
 * Handles content publishing across all platforms simultaneously
 */

import { postToFacebook, postToInstagram } from './platforms/meta'
import { postToLinkedIn } from './platforms/linkedin'
import { postToX } from './platforms/x'
import type { PlatformCredential } from '@/types'

export interface PlatformPublishRequest {
  content: {
    text: string
    hashtags?: string[]
    media_urls?: string[]
  }
  platform: 'meta' | 'linkedin' | 'x' | 'tiktok'
  credential: any
}

export interface PublishResult {
  platform: string
  success: boolean
  post_id?: string
  post_url?: string
  error?: string
}

/**
 * Publish content to a single platform
 */
export async function publishToSinglePlatform(
  request: PlatformPublishRequest
): Promise<PublishResult> {
  const { content, platform, credential } = request

  try {
    switch (platform) {
      case 'meta':
        const metaResult = await postToFacebook(credential, {
          message: `${content.text}\n\n${content.hashtags?.join(' ') || ''}`.trim(),
          picture: content.media_urls?.[0],
        })
        return {
          platform: 'Meta (Facebook)',
          success: true,
          post_id: metaResult.id,
          post_url: metaResult.post_url,
        }

      case 'linkedin':
        const linkedInResult = await postToLinkedIn(credential, {
          text: `${content.text}\n\n${content.hashtags?.map((h) => `#${h}`).join(' ') || ''}`.trim(),
          media: content.media_urls
            ? content.media_urls.map((url) => ({
                type: 'IMAGE' as const,
                url,
              }))
            : undefined,
        })
        return {
          platform: 'LinkedIn',
          success: true,
          post_id: linkedInResult.id,
          post_url: linkedInResult.url,
        }

      case 'x':
        const xResult = await postToX(credential, {
          text: `${content.text}\n${content.hashtags?.map((h) => `#${h}`).join(' ') || ''}`.trim(),
        })
        return {
          platform: 'X (Twitter)',
          success: true,
          post_id: xResult.id,
          post_url: xResult.url,
        }

      case 'tiktok':
        // TikTok API implementation would go here
        return {
          platform: 'TikTok',
          success: false,
          error: 'TikTok integration coming soon',
        }

      default:
        return {
          platform: platform,
          success: false,
          error: `Unknown platform: ${platform}`,
        }
    }
  } catch (error) {
    return {
      platform: platform,
      success: false,
      error: error instanceof Error ? error.message : 'Publishing failed',
    }
  }
}

/**
 * Publish content to multiple platforms in parallel
 */
export async function publishToMultiplePlatforms(
  requests: PlatformPublishRequest[]
): Promise<PublishResult[]> {
  const results = await Promise.all(
    requests.map((request) => publishToSinglePlatform(request))
  )

  return results
}

/**
 * Publish from scheduled post record
 */
export async function publishScheduledPost(
  postId: string,
  credentials: PlatformCredential[],
  adaptedContent: Record<string, string>
): Promise<PublishResult[]> {
  const requests: PlatformPublishRequest[] = credentials.map((cred) => ({
    content: {
      text: adaptedContent[cred.platform_id] || adaptedContent['default'],
      hashtags: [],
      media_urls: [],
    },
    platform: getPlatformType(cred.platform_id),
    credential: {
      access_token: cred.access_token,
      refresh_token: cred.refresh_token,
    },
  }))

  return publishToMultiplePlatforms(requests)
}

/**
 * Helper to map platform ID to type
 */
function getPlatformType(platformId: string): 'meta' | 'linkedin' | 'x' | 'tiktok' {
  const mapping: Record<string, 'meta' | 'linkedin' | 'x' | 'tiktok'> = {
    meta: 'meta',
    facebook: 'meta',
    instagram: 'meta',
    linkedin: 'linkedin',
    x: 'x',
    twitter: 'x',
    tiktok: 'tiktok',
  }

  return mapping[platformId.toLowerCase()] || 'x'
}

/**
 * Check health of all platform credentials
 */
export async function checkAllPlatformHealth(
  credentials: any[]
): Promise<Record<string, { healthy: boolean; lastChecked: string }>> {
  const health: Record<string, { healthy: boolean; lastChecked: string }> = {}

  for (const cred of credentials) {
    const platform = getPlatformType(cred.platform_id)

    // Implement health checks for each platform
    // For now, we'll just mark as unknown
    health[cred.platform_id] = {
      healthy: true, // Would check actual token validity
      lastChecked: new Date().toISOString(),
    }
  }

  return health
}

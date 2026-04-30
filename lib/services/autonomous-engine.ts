/**
 * Autonomous Reply Engine
 * Intelligently posts approved replies based on user-configured rules
 * Handles comment moderation, quality checks, and platform-specific formatting
 */

import { generateSmartReply } from './reply-generator'
import { publishToSinglePlatform } from './platform-publisher'
import {
  emitReplyPosted,
  emitNotification,
} from './realtime'
import type { Reply, Comment } from '@/types'

export interface AutonomyConfig {
  user_id: string
  enabled: boolean
  auto_reply_positive: boolean
  auto_reply_questions: boolean
  auto_reply_neutral: boolean
  auto_reply_negative: boolean
  max_replies_per_hour: number
  skip_moderation_score: number // 0.8 = replies > 80% confidence skip moderation
  forbidden_keywords?: string[]
}

export interface ReplyToPost {
  comment: Comment
  suggested_reply: string
  platform_credential: any
}

/**
 * Evaluate if a reply should be auto-posted based on config
 */
export function shouldAutoPost(
  reply: Reply,
  comment: Comment,
  config: AutonomyConfig
): boolean {
  if (!config.enabled || !reply.is_autonomous) {
    return false
  }

  // Check sentiment rules
  const sentimentAutoReply: Record<string, boolean> = {
    positive: config.auto_reply_positive,
    question: config.auto_reply_questions,
    neutral: config.auto_reply_neutral,
    negative: config.auto_reply_negative,
  }

  if (!sentimentAutoReply[comment.sentiment || 'neutral']) {
    return false
  }

  // Check confidence/quality score
  if ((comment.sentiment_score || 0) < config.skip_moderation_score) {
    return false
  }

  return true
}

/**
 * Check for forbidden keywords in reply
 */
export function containsForbiddenKeywords(
  text: string,
  keywords: string[] = []
): boolean {
  if (keywords.length === 0) return false

  const lowerText = text.toLowerCase()
  return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()))
}

/**
 * Process queue of pending autonomous replies
 */
export async function processPendingReplies(
  userId: string,
  replies: (Reply & { comment?: Comment; platform_credential?: any })[],
  config: AutonomyConfig
): Promise<{
  processed: number
  posted: number
  failed: number
  skipped: number
}> {
  const stats = {
    processed: 0,
    posted: 0,
    failed: 0,
    skipped: 0,
  }

  // Check rate limiting
  const postedThisHour = replies.filter(
    (r) =>
      r.posted_at &&
      new Date(r.posted_at).getTime() > Date.now() - 60 * 60 * 1000
  ).length

  let remainingQuota = Math.max(0, config.max_replies_per_hour - postedThisHour)

  for (const reply of replies) {
    stats.processed++

    // Skip if no quota
    if (remainingQuota <= 0) {
      stats.skipped++
      continue
    }

    if (!reply.comment || !reply.platform_credential) {
      stats.skipped++
      continue
    }

    // Check forbidden keywords
    if (containsForbiddenKeywords(reply.suggested_reply, config.forbidden_keywords)) {
      console.log('[v0] Reply blocked: forbidden keywords detected')
      stats.skipped++
      continue
    }

    // Evaluate autonomy rules
    if (!shouldAutoPost(reply, reply.comment, config)) {
      stats.skipped++
      continue
    }

    try {
      // Post the reply to platform
      const platform = reply.platform_credential.platform_id as 'meta' | 'linkedin' | 'x' | 'tiktok'

      const publishResult = await publishToSinglePlatform({
        content: {
          text: reply.suggested_reply,
        },
        platform,
        credential: reply.platform_credential,
      })

      if (publishResult.success) {
        // Record successful post
        stats.posted++
        remainingQuota--

        // Emit notification
        emitReplyPosted(userId, {
          id: reply.id,
          reply_id: reply.id,
          platform: publishResult.platform,
          post_url: publishResult.post_url || '',
          status: 'posted',
        })

        console.log(`[v0] Reply posted autonomously to ${platform}`)
      } else {
        stats.failed++
        console.error('[v0] Failed to post reply:', publishResult.error)

        emitNotification(userId, {
          id: `reply-${reply.id}`,
          title: 'Reply Post Failed',
          message: `Failed to post reply: ${publishResult.error}`,
          level: 'error',
        })
      }
    } catch (error) {
      stats.failed++
      console.error('[v0] Error posting reply:', error)

      emitNotification(userId, {
        id: `reply-${reply.id}`,
        title: 'Reply Post Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        level: 'error',
      })
    }
  }

  return stats
}

/**
 * Generate and auto-post replies for batch of comments
 */
export async function generateAndAutoPost(
  userId: string,
  comments: Comment[],
  config: AutonomyConfig
): Promise<{
  total: number
  generated: number
  posted: number
}> {
  const stats = {
    total: comments.length,
    generated: 0,
    posted: 0,
  }

  for (const comment of comments) {
    try {
      // Generate reply
      const reply = await generateSmartReply({
        commentText: comment.comment_text,
        niche: 'general',
        userId,
      })

      stats.generated++

      // Check if should auto-post
      if (shouldAutoPost(
        {
          ...reply,
          id: '',
          user_id: userId,
          comment_id: comment.id,
          suggested_reply: reply.suggested_reply,
          final_reply: null,
          is_approved: false,
          is_autonomous: reply.confidence > config.skip_moderation_score,
          approved_by_user: false,
          platform_reply_id: null,
          posted_at: null,
          status: 'pending',
          error_message: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        comment,
        config
      )) {
        stats.posted++
        emitNotification(userId, {
          id: `auto-reply-${comment.id}`,
          title: 'Reply Posted',
          message: `Auto-posted reply to ${comment.commenter_name}`,
          level: 'success',
        })
      }
    } catch (error) {
      console.error('[v0] Error generating reply for comment:', error)
    }
  }

  return stats
}

/**
 * Validate autonomy configuration
 */
export function validateConfig(config: AutonomyConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (config.max_replies_per_hour < 1) {
    errors.push('Max replies per hour must be at least 1')
  }

  if (config.skip_moderation_score < 0 || config.skip_moderation_score > 1) {
    errors.push('Confidence threshold must be between 0 and 1')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

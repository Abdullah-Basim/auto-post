import { Anthropic } from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAgentLog } from '@/lib/db/queries'
import type { Comment } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ReplyConfig {
  autoReplyPositive: boolean
  autoReplyQuestions: boolean
  autoReplyNegative: boolean
  maxDailyAutoReplies: number
  maxTokensPerReply: number
}

const DEFAULT_CONFIG: ReplyConfig = {
  autoReplyPositive: true,
  autoReplyQuestions: false,
  autoReplyNegative: false,
  maxDailyAutoReplies: 100,
  maxTokensPerReply: 300,
}

/**
 * Generate an AI-powered reply to a comment
 */
export async function generateCommentReply(
  comment: Comment,
  context: {
    postContent?: string
    brandVoice?: string
  }
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const systemPrompt = `You are an AI assistant helping to respond to social media comments. 
Your responses should be:
- Concise (1-2 sentences max)
- Professional yet friendly
- Aligned with the brand voice${context.brandVoice ? `: ${context.brandVoice}` : ''}
- Authentic and human-like, not robotic
- Never mention that you're AI-generated

Respond only with the reply text, no explanations or additional formatting.`

  const userPrompt = `Comment: "${comment.comment_text}"
Sentiment: ${comment.sentiment}
${context.postContent ? `Post context: "${context.postContent}"` : ''}

Generate a thoughtful, appropriate reply to this ${comment.sentiment} comment.`

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 150,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  const replyText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as any).text)
    .join('\n')
    .trim()

  return replyText
}

/**
 * Process comments and generate autonomous replies based on configuration
 */
export async function processCommentsForAutonomousReplies(
  userId: string,
  config: Partial<ReplyConfig> = {}
): Promise<{
  processed: number
  replies: Array<{ commentId: string; replyText: string; action: 'posted' | 'queued' }>
  errors: Array<{ commentId: string; error: string }>
}> {
  const supabase = await createClient()
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  const results = {
    processed: 0,
    replies: [] as Array<{ commentId: string; replyText: string; action: 'posted' | 'queued' }>,
    errors: [] as Array<{ commentId: string; error: string }>,
  }

  try {
    // Get unreviewed comments
    const { data: comments, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', userId)
      .eq('has_reply', false)
      .order('created_at', { ascending: true })
      .limit(50)

    if (fetchError) throw fetchError

    for (const comment of comments || []) {
      try {
        // Check sentiment filter
        const shouldAutoReply =
          (comment.sentiment === 'positive' && mergedConfig.autoReplyPositive) ||
          (comment.sentiment === 'question' && mergedConfig.autoReplyQuestions) ||
          (comment.sentiment === 'negative' && mergedConfig.autoReplyNegative)

        if (!shouldAutoReply) {
          continue
        }

        // Generate reply
        const replyText = await generateCommentReply(comment, {
          postContent: comment.comment_text,
        })

        // Create reply record
        const { data: reply, error: insertError } = await supabase
          .from('replies')
          .insert({
            user_id: userId,
            comment_id: comment.id,
            suggested_reply: replyText,
            final_reply: replyText,
            is_approved: true,
            is_autonomous: true,
            approved_by_user: false,
            status: 'pending',
          })
          .select()
          .single()

        if (insertError) throw insertError

        results.replies.push({
          commentId: comment.id,
          replyText,
          action: 'queued',
        })

        // Log activity
        await createAgentLog({
          user_id: userId,
          agent_action: 'autonomous_reply_generated',
          log_level: 'info',
          message: `Generated autonomous reply for ${comment.sentiment} comment`,
          raw_json: {
            commentId: comment.id,
            sentiment: comment.sentiment,
            replyLength: replyText.length,
          },
        })

        results.processed++
      } catch (error) {
        console.error(`[v0] Error processing comment ${comment.id}:`, error)
        results.errors.push({
          commentId: comment.id,
          error: String(error),
        })
      }
    }

    return results
  } catch (error) {
    console.error('[v0] Error processing autonomous replies:', error)
    throw error
  }
}

/**
 * Get autonomy configuration for a user
 */
export async function getAutonomyConfig(userId: string): Promise<ReplyConfig> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('autonomy_config')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      throw error
    }

    return data ? data.config : DEFAULT_CONFIG
  } catch (error) {
    console.error('[v0] Error fetching autonomy config:', error)
    return DEFAULT_CONFIG
  }
}

/**
 * Update autonomy configuration for a user
 */
export async function updateAutonomyConfig(
  userId: string,
  config: Partial<ReplyConfig>
): Promise<ReplyConfig> {
  const supabase = await createClient()
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  try {
    const { data, error } = await supabase
      .from('autonomy_config')
      .upsert({
        user_id: userId,
        config: mergedConfig,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    await createAgentLog({
      user_id: userId,
      agent_action: 'autonomy_config_updated',
      log_level: 'info',
      message: 'Autonomy configuration updated',
      raw_json: { config: mergedConfig },
    })

    return mergedConfig
  } catch (error) {
    console.error('[v0] Error updating autonomy config:', error)
    throw error
  }
}

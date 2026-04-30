import { advancedSentimentAnalysis, generateReplyTemplates } from './streaming-agent'

export interface ReplyGenerationRequest {
  commentText: string
  postContext?: string
  brandVoice?: string
  niche?: string
  userId: string
}

export interface GeneratedReply {
  suggested_reply: string
  alternatives: string[]
  sentiment: string
  tone: string
  confidence: number
  should_respond: boolean
}

/**
 * Generate intelligent replies with multiple suggestions
 */
export async function generateSmartReply(
  request: ReplyGenerationRequest
): Promise<GeneratedReply> {
  const { commentText, postContext, brandVoice = 'professional', niche = 'general' } = request

  try {
    // Analyze sentiment
    const sentiment = await advancedSentimentAnalysis(commentText, postContext)

    // Generate reply templates based on sentiment
    const templates = await generateReplyTemplates(
      sentiment.sentiment,
      `${postContext || 'a post'} in ${niche} niche`
    )

    // Create the best reply from templates
    const mainReply = templates[0] || 'Thank you for your feedback!'

    return {
      suggested_reply: mainReply,
      alternatives: templates.slice(1),
      sentiment: sentiment.sentiment,
      tone: sentiment.suggested_tone,
      confidence: sentiment.score,
      should_respond: shouldRespond(sentiment.sentiment, sentiment.score),
    }
  } catch (error) {
    console.error('[v0] Reply generation error:', error)

    return {
      suggested_reply: 'Thank you for your comment!',
      alternatives: ['We appreciate your feedback!', 'Thanks for reaching out!'],
      sentiment: 'neutral',
      tone: 'professional',
      confidence: 0.5,
      should_respond: true,
    }
  }
}

/**
 * Determine if a comment requires a response
 */
function shouldRespond(sentiment: string, confidence: number): boolean {
  // Always respond to questions
  if (sentiment === 'question') return true

  // Always respond to positive feedback
  if (sentiment === 'positive') return true

  // Respond to negative with high confidence
  if (sentiment === 'negative' && confidence > 0.7) return true

  // Optional response for neutral
  if (sentiment === 'neutral') return confidence > 0.6

  return false
}

/**
 * Batch process multiple comments for reply suggestions
 */
export async function batchGenerateReplies(
  comments: ReplyGenerationRequest[]
): Promise<Array<{ id?: string; reply: GeneratedReply; error?: string }>> {
  const results = []

  for (const comment of comments) {
    try {
      const reply = await generateSmartReply(comment)
      results.push({
        reply,
      })
    } catch (error) {
      results.push({
        reply: {
          suggested_reply: 'Thank you for your comment!',
          alternatives: [],
          sentiment: 'neutral',
          tone: 'professional',
          confidence: 0,
          should_respond: false,
        },
        error: error instanceof Error ? error.message : 'Reply generation failed',
      })
    }
  }

  return results
}

/**
 * Filter and prioritize comments that need responses
 */
export interface CommentForProcessing {
  id: string
  text: string
  postContext?: string
  sentiment?: string
}

export async function prioritizeComments(
  comments: CommentForProcessing[]
): Promise<CommentForProcessing[]> {
  // Sentiment order: question > positive > negative > neutral
  const sentimentPriority: Record<string, number> = {
    question: 0,
    positive: 1,
    negative: 2,
    neutral: 3,
  }

  return comments.sort((a, b) => {
    const aPriority = sentimentPriority[a.sentiment || 'neutral'] ?? 999
    const bPriority = sentimentPriority[b.sentiment || 'neutral'] ?? 999
    return aPriority - bPriority
  })
}

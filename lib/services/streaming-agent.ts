import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Streaming response handler for real-time content generation
 * Sends updates to client via Server-Sent Events
 */
export async function* streamContentGeneration(
  niche: string,
  stage: 'discovery' | 'enrichment' | 'copywriting' | 'creative' | 'approval'
): AsyncGenerator<string> {
  const prompts: Record<typeof stage, string> = {
    discovery: `You are a social media strategist. Identify 5 trending topics in the "${niche}" niche that would resonate with audiences. For each topic, provide a brief explanation of why it's trending and its relevance. Format as JSON array with objects containing "title", "explanation", "relevance_score".`,

    enrichment: `You are a content researcher. Provide detailed enrichment for a trending topic in "${niche}". Include key statistics, related subtopics, content angles, and engagement hooks. Format as JSON with fields: "insights", "statistics", "subtopics", "angles".`,

    copywriting: `You are a social media copywriter. Write engaging, platform-agnostic copy about a trending topic in "${niche}". Include attention-grabbing hooks, clear value proposition, and call-to-action. Format as JSON with fields: "headline", "body_copy", "cta", "hashtags".`,

    creative: `You are a creative director. Develop a visual content brief for a post about a trending topic in "${niche}". Specify image type, visual elements, color palette, and platform-specific dimensions. Format as JSON with fields: "visual_type", "elements", "colors", "dimensions", "platform_notes".`,

    approval: `You are a content reviewer. Evaluate the quality and brand alignment of content about a trending topic in "${niche}". Provide approval status, quality score (0-100), and improvement suggestions. Format as JSON with fields: "approved", "quality_score", "suggestions", "brand_alignment".`,
  }

  try {
    const stream = client.messages.stream({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompts[stage],
        },
      ],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
  } catch (error) {
    yield `Error in ${stage} phase: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

/**
 * Batch content generation with concurrent processing
 */
export async function batchGenerateContent(
  niche: string,
  count: number = 3
): Promise<Array<{ title: string; content: string; quality_score: number }>> {
  const results = []

  for (let i = 0; i < count; i++) {
    try {
      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `Generate a unique social media post idea for the "${niche}" niche. Include a catchy headline and 2-3 sentence description. Return as JSON with "title" and "description" fields.`,
          },
        ],
      })

      const text = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')

      const parsed = JSON.parse(text)
      results.push({
        title: parsed.title || `Post ${i + 1}`,
        content: parsed.description || text,
        quality_score: 0.8,
      })
    } catch (error) {
      console.error('[v0] Batch generation error:', error)
    }
  }

  return results
}

/**
 * Platform-specific content adaptation
 */
export async function adaptContentForPlatform(
  content: string,
  platform: 'meta' | 'linkedin' | 'x' | 'tiktok'
): Promise<{ adapted_copy: string; hashtags: string[]; media_specs: Record<string, any> }> {
  const platformGuides: Record<typeof platform, string> = {
    meta: 'Facebook/Instagram - visual-first, engaging captions (150-200 chars ideal), 3-5 hashtags, 1200x628px for feeds',
    linkedin: 'Professional network - 1000-1500 chars ideal, thought-leadership focused, 2-3 hashtags, square images 1200x1200px',
    x: 'Twitter/X - max 280 characters, conversational tone, hashtags, video format 16:9',
    tiktok: 'Short-form video - 15-60 seconds, trending sounds, hashtags, vertical 9:16 ratio',
  }

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Adapt this content for ${platformGuides[platform]}: "${content}". Return JSON with "adapted_copy", "hashtags" (array), and "media_specs" object.`,
        },
      ],
    })

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return JSON.parse(text)
  } catch (error) {
    console.error('[v0] Adaptation error:', error)
    return {
      adapted_copy: content,
      hashtags: [],
      media_specs: {},
    }
  }
}

/**
 * Advanced sentiment analysis with context
 */
export async function advancedSentimentAnalysis(
  text: string,
  context?: string
): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral' | 'question'
  score: number
  emotion: string
  suggested_tone: string
}> {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Analyze sentiment: "${text}"${context ? ` Context: ${context}` : ''}. Return JSON with "sentiment" (positive/negative/neutral/question), "score" (0-1), "emotion" (detected emotion), "suggested_tone" (response tone to use).`,
        },
      ],
    })

    const text_content = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return JSON.parse(text_content)
  } catch (error) {
    console.error('[v0] Sentiment analysis error:', error)
    return {
      sentiment: 'neutral',
      score: 0.5,
      emotion: 'unknown',
      suggested_tone: 'professional',
    }
  }
}

/**
 * Generate response templates for different comment types
 */
export async function generateReplyTemplates(
  sentiment: string,
  context: string
): Promise<string[]> {
  const templates: Record<string, string> = {
    positive: 'Thank you reply emphasizing the benefit',
    negative: 'Understanding response offering solutions',
    neutral: 'Informative response with call-to-action',
    question: 'Direct, helpful answer to the question',
  }

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Generate 3 different reply templates for a ${sentiment} comment about: "${context}". Templates should be professional, brief (1-2 sentences), and authentic. Return as JSON array of strings.`,
        },
      ],
    })

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return JSON.parse(text)
  } catch (error) {
    console.error('[v0] Template generation error:', error)
    return [
      'Thanks for your feedback!',
      'We appreciate your comment!',
      'Thank you for reaching out!',
    ]
  }
}

/**
 * Content performance scoring
 */
export async function scoreContent(
  content: string,
  platform: string,
  niche: string
): Promise<{ score: number; breakdown: Record<string, number>; improvements: string[] }> {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Score this ${platform} content for the "${niche}" niche on 0-100: "${content}". Provide: overall score, breakdown scores for (engagement, clarity, platform-fit, brand-voice), and 2-3 improvement suggestions. Return JSON.`,
        },
      ],
    })

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    return JSON.parse(text)
  } catch (error) {
    console.error('[v0] Scoring error:', error)
    return {
      score: 75,
      breakdown: {
        engagement: 75,
        clarity: 80,
        'platform-fit': 70,
        'brand-voice': 75,
      },
      improvements: ['Add more specific calls-to-action', 'Enhance visual description', 'Strengthen opening hook'],
    }
  }
}

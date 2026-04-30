import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { updateAgentState, createAgentLog, createContentPiece } from '@/lib/db/queries'
import type { Campaign, ContentPiece, PipelineStage } from '@/types'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Validate API key exists
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[v0] ANTHROPIC_API_KEY not set - Claude AI features will not work')
}

type PipelineStageType = 'source_discovery' | 'topic_enrichment' | 'copywriting' | 'creative_generation' | 'platform_approval'

const PIPELINE_STAGES: PipelineStageType[] = [
  'source_discovery',
  'topic_enrichment',
  'copywriting',
  'creative_generation',
  'platform_approval',
]

export interface ContentGenerationRequest {
  campaignId: string
  niche: string
  targetPlatforms: string[]
  userId: string
}

export interface ContentGenerationResult {
  contentPieceId: string
  success: boolean
  reasoning: any
  message: string
}

/**
 * Generate content through the 5-stage pipeline using Claude
 */
export async function generateContentPipeline(
  request: ContentGenerationRequest
): Promise<ContentGenerationResult> {
  const { campaignId, niche, targetPlatforms, userId } = request

  try {
    // Step 1: Source Discovery
    await updateAgentState({
      user_id: userId,
      current_status: 'scanning',
      current_action: 'Discovering trending topics in ' + niche,
      stage_progress: 0,
      current_campaign_id: campaignId,
    })

    await createAgentLog({
      user_id: userId,
      campaign_id: campaignId,
      agent_action: 'source_discovery_started',
      log_level: 'info',
      message: `Starting source discovery for niche: ${niche}`,
    })

    const sourceDiscoveryPrompt = `You are a social media content strategist. Analyze the following niche: "${niche}"
    
    Identify 3-5 trending topics that would be highly relevant to this niche. For each topic, provide:
    1. Topic title
    2. Why it's trending
    3. Relevance to the niche
    4. Recommended platforms to post on
    
    Return your response as a JSON object with a "topics" array.`

    const sourceResponse = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: sourceDiscoveryPrompt,
        },
      ],
    })

    const sourceInsights = extractTextContent(sourceResponse.content)
    const sourceTopics = parseJSON(sourceInsights)?.topics || []
    
    await createAgentLog({
      user_id: userId,
      campaign_id: campaignId,
      content_piece_id: undefined,
      agent_action: 'source_discovery_completed',
      log_level: 'info',
      message: `Discovered ${sourceTopics.length} trending topics`,
      raw_json: {
        stage: 'source_discovery',
        topicsCount: sourceTopics.length,
        topics: sourceTopics,
      },
    })

    // Step 2: Topic Enrichment
    await updateAgentState({
      user_id: userId,
      current_status: 'enriching',
      current_action: 'Enriching topics with detailed insights',
      stage_progress: 1,
    })

    const enrichmentPrompt = `Based on these trending topics for "${niche}": ${JSON.stringify(sourceTopics.slice(0, 2))}
    
    For each topic, provide:
    1. Detailed explanation
    2. Key statistics or data points
    3. Related subtopics
    4. Content angles that would resonate
    
    Return as JSON with "enriched_topics" array.`

    const enrichResponse = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: enrichmentPrompt,
        },
      ],
    })

    const enrichedContent = extractTextContent(enrichResponse.content)
    const enrichedTopics = parseJSON(enrichedContent)?.enriched_topics || []
    
    await createAgentLog({
      user_id: userId,
      campaign_id: campaignId,
      content_piece_id: undefined,
      agent_action: 'topic_enrichment_completed',
      log_level: 'info',
      message: `Enriched ${enrichedTopics.length} topics with detailed insights`,
      raw_json: {
        stage: 'topic_enrichment',
        enrichedContent: enrichedContent.substring(0, 500),
      },
    })

    // Step 3: Copywriting
    await updateAgentState({
      user_id: userId,
      current_status: 'writing',
      current_action: 'Generating compelling copy',
      stage_progress: 2,
    })

    const copywritingPrompt = `Create an engaging social media post about "${sourceTopics[0]?.title || 'trending topic'}" for the "${niche}" niche.
    
    The post should:
    1. Be attention-grabbing
    2. Include a clear call-to-action
    3. Be suitable for multiple platforms
    4. Include relevant hashtags
    
    Return as JSON with "copy", "hashtags", and "cta" fields.`

    const copyResponse = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: copywritingPrompt,
        },
      ],
    })

    const copywriting = extractTextContent(copyResponse.content)
    const copyData = parseJSON(copywriting) || {}
    
    await createAgentLog({
      user_id: userId,
      campaign_id: campaignId,
      content_piece_id: undefined,
      agent_action: 'copywriting_completed',
      log_level: 'info',
      message: `Generated compelling social media copy`,
      raw_json: {
        stage: 'copywriting',
        copyLength: copyData.copy?.length || 0,
        hasHashtags: !!copyData.hashtags,
        hasCTA: !!copyData.cta,
      },
    })

    // Step 4: Creative Generation Brief
    await updateAgentState({
      user_id: userId,
      current_status: 'creating',
      current_action: 'Generating creative assets brief',
      stage_progress: 3,
    })

    const creativePrompt = `Create a visual content brief for a post about "${sourceTopics[0]?.title || 'trending topic'}".
    
    Specify:
    1. Image type (photo, graphic, video, carousel)
    2. Key visual elements
    3. Color palette suggestions
    4. Text overlays or captions
    5. Platform-specific dimensions
    
    Return as JSON with "creative_brief" and "platform_specs" fields.`

    const creativeResponse = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: creativePrompt,
        },
      ],
    })

    const creativeBrief = extractTextContent(creativeResponse.content)
    const creativeData = parseJSON(creativeBrief) || {}
    
    await createAgentLog({
      user_id: userId,
      campaign_id: campaignId,
      content_piece_id: undefined,
      agent_action: 'creative_generation_completed',
      log_level: 'info',
      message: `Generated visual content brief and platform specifications`,
      raw_json: {
        stage: 'creative_generation',
        hasCreativeBrief: !!creativeData.creative_brief,
        hasPlatformSpecs: !!creativeData.platform_specs,
      },
    })

    // Step 5: Final Approval
    await updateAgentState({
      user_id: userId,
      current_status: 'approving',
      current_action: 'Finalizing content approval',
      stage_progress: 4,
    })

    // Create content piece with all generated data
    const contentPiece = await createContentPiece({
      user_id: userId,
      campaign_id: campaignId,
      stage: 'platform_approval' as PipelineStageType,
      stage_progress: 100,
      source_topics: sourceTopics.map((t: any) => t.title || t).filter(Boolean),
      enriched_content: enrichedContent,
      copywriting: copywriting,
      creative_brief: creativeBrief,
      creative_assets: [],
      reasoning: {
        sourceDiscovery: {
          stage: 'source_discovery',
          description: 'Identified trending topics relevant to niche',
          topics: sourceTopics,
          topicCount: sourceTopics.length,
        },
        enrichment: {
          stage: 'topic_enrichment',
          description: 'Researched and enriched topics with detailed insights',
          insights: enrichedContent.substring(0, 300),
        },
        copywriting: {
          stage: 'copywriting',
          description: 'Generated compelling, platform-ready copy',
          data: copyData,
        },
        creative: {
          stage: 'creative_generation',
          description: 'Created visual content brief and platform specifications',
          data: creativeData,
        },
      },
      source_insights: sourceTopics.map((t: any) => t.explanation || t.why_trending || '').filter(Boolean),
      status: 'completed',
      quality_score: 0.85,
    })

    // Final state update
    await updateAgentState({
      user_id: userId,
      current_status: 'idle',
      current_action: null,
      stage_progress: 5,
    })

    await createAgentLog({
      user_id: userId,
      campaign_id: campaignId,
      content_piece_id: contentPiece.id,
      agent_action: 'pipeline_completed',
      log_level: 'info',
      message: `Content pipeline completed successfully`,
      raw_json: {
        stagesCompleted: 5,
        contentPieceId: contentPiece.id,
      },
    })

    return {
      contentPieceId: contentPiece.id,
      success: true,
      reasoning: contentPiece.reasoning,
      message: 'Content generated successfully through all 5 pipeline stages',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await updateAgentState({
      user_id: request.userId,
      current_status: 'idle',
      current_action: null,
    })

    await createAgentLog({
      user_id: request.userId,
      campaign_id: campaignId,
      agent_action: 'pipeline_error',
      log_level: 'error',
      message: `Pipeline error: ${errorMessage}`,
    })

    throw error
  }
}

/**
 * Generate AI reply to a comment
 */
export async function generateReplyToComment(
  commentText: string,
  contextNiche: string,
  userId: string
): Promise<string> {
  const prompt = `You are a friendly and professional social media manager for a business in the "${contextNiche}" niche.
  
  A user commented on one of our posts with: "${commentText}"
  
  Generate a short, engaging, and professional reply (1-2 sentences max) that:
  1. Acknowledges their comment
  2. Is authentic and not generic
  3. Maintains brand voice
  4. Encourages further engagement if appropriate
  
  Return only the reply text, no additional formatting.`

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  return extractTextContent(response.content)
}

/**
 * Analyze sentiment of a comment
 */
export async function analyzeSentiment(
  commentText: string
): Promise<{ sentiment: 'positive' | 'negative' | 'neutral' | 'question'; score: number }> {
  const prompt = `Analyze the sentiment of this comment and return ONLY a JSON object with "sentiment" (positive/negative/neutral/question) and "score" (0-1):
  
  "${commentText}"`

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const text = extractTextContent(response.content)
  return parseJSON(text) || { sentiment: 'neutral', score: 0.5 }
}

// Helper functions
function extractTextContent(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

function parseJSON(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return null
  } catch {
    return null
  }
}

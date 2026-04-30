import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scoreContent, adaptContentForPlatform, advancedSentimentAnalysis } from '@/lib/services/streaming-agent'

/**
 * Comprehensive content analysis endpoint
 * Analyzes content quality, platform fit, and provides optimization suggestions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content, platforms, niche, context } = body

    if (!content || !platforms || !Array.isArray(platforms)) {
      return NextResponse.json(
        { error: 'Missing required fields: content, platforms (array)' },
        { status: 400 }
      )
    }

    // Analyze content quality
    const analysis = {
      original: {
        content,
        quality: null as any,
      },
      adaptations: {} as Record<string, any>,
      sentiment: null as any,
      recommendations: [] as string[],
    }

    // Score original content
    if (niche) {
      analysis.original.quality = await scoreContent(content, 'generic', niche)
    }

    // Analyze sentiment
    analysis.sentiment = await advancedSentimentAnalysis(content, context)

    // Adapt for each platform
    for (const platform of platforms) {
      try {
        analysis.adaptations[platform] = await adaptContentForPlatform(
          content,
          platform as 'meta' | 'linkedin' | 'x' | 'tiktok'
        )
      } catch (error) {
        console.error(`[v0] Adaptation error for ${platform}:`, error)
        analysis.adaptations[platform] = {
          error: `Failed to adapt for ${platform}`,
        }
      }
    }

    // Generate recommendations
    if (analysis.original.quality?.improvements) {
      analysis.recommendations.push(...analysis.original.quality.improvements)
    }

    if (analysis.sentiment?.suggested_tone) {
      analysis.recommendations.push(
        `Adjust tone to be more ${analysis.sentiment.suggested_tone} to better match audience sentiment`
      )
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('[v0] Content analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

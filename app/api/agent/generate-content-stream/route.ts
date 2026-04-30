import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateContentPipeline } from '@/lib/services/claude-agent'
import { updateAgentState, createAgentLog } from '@/lib/db/queries'

/**
 * Streaming content generation endpoint
 * Accepts POST request and streams back agent state updates
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, niche, targetPlatforms } = body

    if (!campaignId || !niche) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignId, niche' },
        { status: 400 }
      )
    }

    // Return Server-Sent Events stream
    const encoder = new TextEncoder()
    let controller: ReadableStreamDefaultController<Uint8Array>

    const stream = new ReadableStream({
      async start(ctrl) {
        controller = ctrl
        
        try {
          // Send initial event
          controller.enqueue(
            encoder.encode('data: ' + JSON.stringify({
              type: 'pipeline_started',
              timestamp: new Date().toISOString(),
              niche,
            }) + '\n\n')
          )

          // Run the pipeline
          const result = await generateContentPipeline({
            campaignId,
            niche,
            targetPlatforms: targetPlatforms || [],
            userId: user.id,
          })

          // Send completion event
          controller.enqueue(
            encoder.encode('data: ' + JSON.stringify({
              type: 'pipeline_completed',
              timestamp: new Date().toISOString(),
              contentPieceId: result.contentPieceId,
              reasoning: result.reasoning,
            }) + '\n\n')
          )

          controller.close()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          
          controller.enqueue(
            encoder.encode('data: ' + JSON.stringify({
              type: 'pipeline_error',
              timestamp: new Date().toISOString(),
              error: errorMessage,
            }) + '\n\n')
          )

          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[v0] Content generation stream error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Stream failed' },
      { status: 500 }
    )
  }
}

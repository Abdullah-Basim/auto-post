import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamContentGeneration } from '@/lib/services/streaming-agent'

/**
 * Server-Sent Events endpoint for streaming content generation
 * Allows real-time progress updates to the client
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
    const { niche, stage = 'discovery' } = body

    if (!niche) {
      return NextResponse.json(
        { error: 'Missing required field: niche' },
        { status: 400 }
      )
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial event
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'started', stage, timestamp: new Date().toISOString() })}\n\n`
            )
          )

          // Stream generation
          for await (const chunk of streamContentGeneration(niche, stage)) {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`
              )
            )
          }

          // Send completion event
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'complete', timestamp: new Date().toISOString() })}\n\n`
            )
          )

          controller.close()
        } catch (error) {
          console.error('[v0] Stream error:', error)
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[v0] Streaming endpoint error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Streaming failed' },
      { status: 500 }
    )
  }
}

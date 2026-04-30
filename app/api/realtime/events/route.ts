import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { realtimeEmitter } from '@/lib/services/realtime'

/**
 * GET /api/realtime/events
 * Server-Sent Events endpoint for real-time updates
 * Client connects and receives updates for their account
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create SSE stream
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const startMessage = `data: ${JSON.stringify({
          type: 'connected',
          userId: user.id,
          timestamp: new Date().toISOString(),
        })}\n\n`

        controller.enqueue(encoder.encode(startMessage))

        // Subscribe to events for this user
        const unsubscribe = realtimeEmitter.subscribe(user.id, (message) => {
          const eventData = `data: ${JSON.stringify(message)}\n\n`
          controller.enqueue(encoder.encode(eventData))
        })

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          unsubscribe()
          controller.close()
        })

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
          try {
            const keepAlive = `data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString(),
            })}\n\n`
            controller.enqueue(encoder.encode(keepAlive))
          } catch (error) {
            clearInterval(heartbeat)
          }
        }, 30000) // 30 second heartbeat
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  } catch (error) {
    console.error('[v0] Realtime connection error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    )
  }
}

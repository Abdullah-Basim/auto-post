import { NextRequest } from 'next/server'

/**
 * WebSocket endpoint for real-time agent status and logs
 * In a production environment, this would use a library like Socket.IO
 * For now, we'll use Server-Sent Events (SSE) as a fallback
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('mode') || 'status'

  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(new TextEncoder().encode(`data: {"type":"connected","mode":"${mode}"}\n\n`))

      // Simulate real-time updates
      const interval = setInterval(() => {
        const message = {
          type: 'update',
          timestamp: new Date().toISOString(),
          mode: mode,
        }
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`))
      }, 3000)

      // Cleanup on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
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
}

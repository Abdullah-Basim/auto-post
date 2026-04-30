'use client'

import { useEffect, useCallback, useState } from 'react'

export interface RealtimeMessage {
  type: string
  timestamp: string
  data: any
}

export function useRealtime(onMessage?: (message: RealtimeMessage) => void) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  const connect = useCallback(() => {
    if (eventSource) return

    try {
      const source = new EventSource('/api/realtime/events')

      source.addEventListener('connected', (event) => {
        console.log('[v0] Realtime connected:', event.data)
        setIsConnected(true)
        setError(null)
      })

      source.addEventListener('message', (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data)

          // Handle heartbeat
          if (message.type === 'heartbeat') {
            return
          }

          if (onMessage) {
            onMessage(message)
          }
        } catch (err) {
          console.error('[v0] Failed to parse message:', err)
        }
      })

      // Listen to all event types
      source.addEventListener('comment_received', (event) => {
        const message: RealtimeMessage = {
          type: 'comment_received',
          timestamp: new Date().toISOString(),
          data: JSON.parse(event.data),
        }
        if (onMessage) onMessage(message)
      })

      source.addEventListener('reply_generated', (event) => {
        const message: RealtimeMessage = {
          type: 'reply_generated',
          timestamp: new Date().toISOString(),
          data: JSON.parse(event.data),
        }
        if (onMessage) onMessage(message)
      })

      source.addEventListener('reply_posted', (event) => {
        const message: RealtimeMessage = {
          type: 'reply_posted',
          timestamp: new Date().toISOString(),
          data: JSON.parse(event.data),
        }
        if (onMessage) onMessage(message)
      })

      source.addEventListener('post_published', (event) => {
        const message: RealtimeMessage = {
          type: 'post_published',
          timestamp: new Date().toISOString(),
          data: JSON.parse(event.data),
        }
        if (onMessage) onMessage(message)
      })

      source.onerror = (error) => {
        console.error('[v0] EventSource error:', error)
        setIsConnected(false)
        setError('Connection lost')
        source.close()
        setEventSource(null)
      }

      setEventSource(source)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      setError(message)
      console.error('[v0] Realtime connection error:', err)
    }
  }, [eventSource, onMessage])

  const disconnect = useCallback(() => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
      setIsConnected(false)
    }
  }, [eventSource])

  // Auto-connect on mount
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [])

  return {
    isConnected,
    error,
    connect,
    disconnect,
  }
}

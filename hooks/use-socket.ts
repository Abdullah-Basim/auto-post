'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  userId: string
  enabled?: boolean
}

export function useSocket({ userId, enabled = true }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    if (!enabled || !userId) return

    // Initialize socket connection
    const socket = io(process.env.NEXT_PUBLIC_APP_URL || '/', {
      auth: {
        userId,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('[v0] Connected to WebSocket server')
      reconnectAttemptsRef.current = 0
    })

    socket.on('disconnect', () => {
      console.log('[v0] Disconnected from WebSocket server')
    })

    socket.on('error', (error) => {
      console.error('[v0] WebSocket error:', error)
    })

    socket.on('connect_error', (error) => {
      console.error('[v0] WebSocket connection error:', error)
      reconnectAttemptsRef.current++
    })

    socketRef.current = socket

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [userId, enabled])

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    } else {
      console.warn('[v0] Socket not connected, cannot emit:', event)
    }
  }, [])

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (!socketRef.current) return

    socketRef.current.on(event, handler)

    return () => {
      socketRef.current?.off(event, handler)
    }
  }, [])

  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    if (!socketRef.current) return

    if (handler) {
      socketRef.current.off(event, handler)
    } else {
      socketRef.current.off(event)
    }
  }, [])

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    isConnected: socketRef.current?.connected ?? false,
  }
}

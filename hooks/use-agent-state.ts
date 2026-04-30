'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AgentState, BrainStatusData } from '@/types'

export function useAgentState() {
  const [agentState, setAgentState] = useState<AgentState | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    // Connect to WebSocket/SSE
    const connectToAgent = () => {
      const eventSource = new EventSource('/api/ws?mode=status')

      eventSource.onopen = () => {
        console.log('[v0] Connected to agent stream')
        setIsConnected(true)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'agent_state_update') {
            setAgentState(data.state)
          } else if (data.type === 'log') {
            setLogs((prev) => [data, ...prev].slice(0, 100))
          }
        } catch (e) {
          console.error('[v0] Failed to parse event:', e)
        }
      }

      eventSource.onerror = () => {
        console.log('[v0] Agent stream disconnected')
        setIsConnected(false)
        eventSource.close()

        // Reconnect after 3 seconds
        setTimeout(connectToAgent, 3000)
      }

      return eventSource
    }

    const eventSource = connectToAgent()

    return () => {
      eventSource.close()
    }
  }, [])

  // Refresh agent state on demand
  const refreshAgentState = useCallback(async () => {
    try {
      const response = await fetch('/api/agent/state')
      if (!response.ok) return
      const data = await response.json()
      setAgentState(data)
    } catch (error) {
      console.error('[v0] Failed to fetch agent state:', error)
    }
  }, [])

  const getBrainStatus = useCallback((): BrainStatusData | null => {
    if (!agentState) return null

    const statusLabels: Record<string, string> = {
      idle: 'Idle',
      scanning: 'Scanning for trends',
      enriching: 'Synthesizing content',
      writing: 'Writing copy',
      creating: 'Generating creatives',
      approving: 'Content approval',
      publishing: 'Publishing posts',
    }

    return {
      status: agentState.current_status,
      action: agentState.current_action || statusLabels[agentState.current_status] || 'Standby',
      progress: agentState.stage_progress,
      totalStages: agentState.total_stages,
      estimatedCompletion: agentState.estimated_completion_at,
      stats: {
        contentGenerated: agentState.total_content_generated,
        postsPublished: agentState.total_posts_published,
        commentsProcessed: agentState.comments_processed,
      },
    }
  }, [agentState])

  return {
    agentState,
    isConnected,
    logs,
    refreshAgentState,
    getBrainStatus,
  }
}

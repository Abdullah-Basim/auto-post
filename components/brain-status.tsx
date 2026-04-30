'use client'

import { useState, useEffect } from 'react'
import { BrainStatusData } from '@/types'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useSocket } from '@/hooks/use-socket'
import { createClient } from '@/lib/supabase/client'

interface BrainStatusProps {
  status?: BrainStatusData | null
  userId?: string
}

export function BrainStatus({ status: initialStatus, userId }: BrainStatusProps) {
  const [status, setStatus] = useState<BrainStatusData | null>(initialStatus || null)
  const supabase = createClient()
  const { on } = useSocket({ userId: userId || '', enabled: !!userId })

  // Fetch initial status if not provided
  useEffect(() => {
    if (initialStatus || !userId) return

    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('agent_state')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (error) throw error
        setStatus(data as BrainStatusData)
      } catch (error) {
        console.error('[v0] Error fetching agent status:', error)
      }
    }

    fetchStatus()
  }, [userId, supabase, initialStatus])

  // Subscribe to real-time status updates
  useEffect(() => {
    const unsubscribe = on('agent:status', (newStatus: BrainStatusData) => {
      setStatus(newStatus)
    })

    return unsubscribe
  }, [on])

  if (!status) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur border border-border">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading agent status...</p>
        </div>
      </Card>
    )
  }

  const statusColors: Record<string, string> = {
    idle: 'bg-muted',
    scanning: 'bg-primary',
    enriching: 'bg-accent',
    writing: 'bg-primary',
    creating: 'bg-accent',
    approving: 'bg-primary',
    publishing: 'bg-accent',
  }

  const statusLabels: Record<string, string> = {
    idle: 'Idle - Ready',
    scanning: 'Scanning for trends',
    enriching: 'Enriching content',
    writing: 'Writing copy',
    creating: 'Generating creatives',
    approving: 'Awaiting approval',
    publishing: 'Publishing posts',
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur overflow-hidden">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Brain Status</h2>
            <p className="text-sm text-muted-foreground mt-1">AI Agent Activity Monitor</p>
          </div>
          <div className={`w-12 h-12 rounded-lg ${statusColors[status.status]} opacity-20 animate-pulse`} />
        </div>

        {/* Status Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Current Status</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColors[status.status]}`} />
              <span className="text-sm font-semibold text-primary">{statusLabels[status.status]}</span>
            </div>
          </div>

          {status.action && (
            <div className="bg-card/50 rounded-lg p-3 border border-border">
              <p className="text-sm text-foreground italic">{status.action}</p>
            </div>
          )}
        </div>

        {/* Progress */}
        {status.status !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pipeline Progress</span>
              <span className="text-xs font-mono text-accent">
                {status.progress} / {status.totalStages}
              </span>
            </div>
            <Progress
              value={(status.progress / status.totalStages) * 100}
              className="h-2 bg-muted"
            />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-primary">{status.stats.contentGenerated}</p>
            <p className="text-xs text-muted-foreground">Content Generated</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-accent">{status.stats.postsPublished}</p>
            <p className="text-xs text-muted-foreground">Posts Published</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-primary">{status.stats.commentsProcessed}</p>
            <p className="text-xs text-muted-foreground">Comments Processed</p>
          </div>
        </div>

        {/* Estimated Completion */}
        {status.estimatedCompletion && (
          <div className="text-xs text-muted-foreground text-center pt-2">
            Estimated completion:{' '}
            <span className="text-foreground font-mono">
              {new Date(status.estimatedCompletion).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}

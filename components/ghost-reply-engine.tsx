'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { CommentsManager } from '@/components/comments-manager'
import { useCallback, useState } from 'react'

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-green-500/20 text-green-300 border border-green-500/30',
  negative: 'bg-red-500/20 text-red-300 border border-red-500/30',
  neutral: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  question: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
}

interface GhostReplyEngineProps {
  fullView?: boolean
  userId?: string
}

export function GhostReplyEngine({ fullView = false, userId }: GhostReplyEngineProps) {
  const [autonomousMode, setAutonomousMode] = useState(false)
  if (fullView && userId) {
    return <CommentsManager userId={userId} />
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2">Ghost Reply Engine</h3>
            <p className="text-sm text-muted-foreground">AI-powered autonomous comment responses</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Autonomous</span>
            <Switch checked={autonomousMode} onCheckedChange={setAutonomousMode} />
          </div>
        </div>

        <div className="bg-card/30 rounded-lg p-4 border border-border">
          <p className="text-sm text-foreground mb-3">
            {autonomousMode
              ? 'Auto-replies enabled - AI will respond to comments matching sentiment criteria'
              : 'Manual mode - Review each comment before responding'}
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Positive Comments</span>
              <span className="text-foreground font-medium">Auto-respond enabled</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Questions</span>
              <span className="text-foreground font-medium">Require approval</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Negative Comments</span>
              <span className="text-foreground font-medium">Manual review only</span>
            </div>
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">Comments will be organized here</p>
          {userId && (
            <Button variant="outline" className="border-border hover:bg-card" asChild>
              <a href="#engagement">View All Comments</a>
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

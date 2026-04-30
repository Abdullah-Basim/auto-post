'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const PLATFORMS = [
  { id: 'meta', name: 'Meta', icon: '📘', status: 'healthy', handle: '@yourbrand' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', status: 'healthy', handle: '@yourcompany' },
  { id: 'x', name: 'X (Twitter)', icon: '𝕏', status: 'warning', handle: '@yourbrand' },
  { id: 'tiktok', name: 'TikTok', icon: '📱', status: 'healthy', handle: '@yourbrand' },
]

interface MultiPlatformManagerProps {
  fullView?: boolean
}

export function MultiPlatformManager({ fullView = false }: MultiPlatformManagerProps) {
  const statusColor: Record<string, string> = {
    healthy: 'bg-accent',
    warning: 'bg-yellow-500',
    error: 'bg-destructive',
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur">
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Multi-Platform Manager</h3>
          <p className="text-sm text-muted-foreground">Connected social media accounts</p>
        </div>

        <div className={fullView ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
          {PLATFORMS.map((platform) => (
            <div
              key={platform.id}
              className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card/70 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <p className="font-semibold text-foreground">{platform.name}</p>
                    <p className="text-xs text-muted-foreground">{platform.handle}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${statusColor[platform.status]}`} />
              </div>

              {fullView && (
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div>Status: {platform.status}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border text-xs hover:bg-card"
                  >
                    Configure
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {!fullView && (
          <Button variant="outline" className="w-full border-border hover:bg-card">
            Manage Platforms
          </Button>
        )}
      </div>
    </Card>
  )
}

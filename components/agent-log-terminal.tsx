'use client'

import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AgentLog {
  type?: string
  timestamp?: string
  level?: string
  message?: string
  action?: string
}

interface AgenticLogTerminalProps {
  logs: AgentLog[]
}

export function AgenticLogTerminal({ logs }: AgenticLogTerminalProps) {
  // Mock logs if not provided
  const mockLogs: AgentLog[] = [
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      action: 'source_discovery_started',
      message: 'Starting source discovery for niche: AI SaaS',
    },
    {
      timestamp: new Date(Date.now() - 1000).toISOString(),
      level: 'info',
      action: 'topics_discovered',
      message: 'Discovered 5 trending topics',
    },
    {
      timestamp: new Date(Date.now() - 2000).toISOString(),
      level: 'info',
      action: 'enrichment_started',
      message: 'Beginning topic enrichment phase',
    },
  ]

  const displayLogs = logs && logs.length > 0 ? logs : mockLogs

  const logLevelColors: Record<string, string> = {
    info: 'text-primary',
    warning: 'text-yellow-500',
    error: 'text-destructive',
    debug: 'text-muted-foreground',
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur h-full">
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Agent Execution Logs</h3>
          <p className="text-sm text-muted-foreground">Real-time agent activity and decision-making</p>
        </div>

        <ScrollArea className="h-96 w-full rounded-lg border border-border bg-background/50 p-4">
          <div className="space-y-3 font-mono text-xs">
            {displayLogs.map((log, index) => {
              const level = (log.level || 'info').toLowerCase()
              const timestamp = log.timestamp
                ? new Date(log.timestamp).toLocaleTimeString()
                : new Date().toLocaleTimeString()

              return (
                <div key={index} className="text-muted-foreground hover:text-foreground transition-colors">
                  <span className="text-muted-foreground/60">[{timestamp}]</span>
                  <span className={`ml-2 font-semibold ${logLevelColors[level] || logLevelColors.info}`}>
                    {level.toUpperCase()}
                  </span>
                  {log.action && (
                    <span className="ml-2 text-primary">{log.action}</span>
                  )}
                  {log.message && (
                    <span className="ml-2 text-foreground">{log.message}</span>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{displayLogs.length} entries</span>
          <span className="text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-accent inline-block animate-pulse mr-2" />
            Live
          </span>
        </div>
      </div>
    </Card>
  )
}

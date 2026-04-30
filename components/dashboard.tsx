'use client'

import { useState } from 'react'
import { BrainStatus } from '@/components/brain-status'
import { QuickStart } from '@/components/quick-start'
import { ContentPipeline } from '@/components/content-pipeline'
import { MultiPlatformManager } from '@/components/multi-platform-manager'
import { GhostReplyEngine } from '@/components/ghost-reply-engine'
import { AgenticLogTerminal } from '@/components/agent-log-terminal'
import { CampaignCenter } from '@/components/campaign-center'
import { PublishingAnalytics } from '@/components/publishing-analytics'
import { AutonomyConfig } from '@/components/autonomy-config'
import { useAgentState } from '@/hooks/use-agent-state'

export function Dashboard({ userId }: { userId: string }) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'campaigns' | 'pipeline' | 'platforms' | 'publishing' | 'engagement' | 'autonomy' | 'logs'>('overview')
  const { agentState, isConnected, logs, getBrainStatus } = useAgentState()

  const brainStatus = getBrainStatus()

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Autopost
              </h1>
              <p className="text-sm text-muted-foreground mt-1">AI-Powered Social Media Management</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-accent' : 'bg-destructive'} animate-pulse`} />
              <span className="text-xs text-muted-foreground">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Section: Brain Status + Quick Start */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Brain Status Widget */}
          <div className="lg:col-span-2">
            <BrainStatus userId={userId} />
          </div>

          {/* Quick Start */}
          <div>
            <QuickStart userId={userId} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-border">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'campaigns', label: 'Campaigns' },
            { id: 'pipeline', label: 'Content Pipeline' },
            { id: 'platforms', label: 'Platforms' },
            { id: 'publishing', label: 'Publishing' },
            { id: 'engagement', label: 'Engagement' },
            { id: 'autonomy', label: 'Autonomy' },
            { id: 'logs', label: 'Agent Logs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                selectedTab === tab.id
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {selectedTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <ContentPipeline userId={userId} />
              </div>
              <MultiPlatformManager />
              <GhostReplyEngine userId={userId} />
            </div>
          )}

          {selectedTab === 'campaigns' && <CampaignCenter />}

          {selectedTab === 'pipeline' && <ContentPipeline fullView userId={userId} />}

          {selectedTab === 'platforms' && <MultiPlatformManager fullView />}

          {selectedTab === 'publishing' && <PublishingAnalytics />}

          {selectedTab === 'engagement' && <GhostReplyEngine fullView userId={userId} />}

          {selectedTab === 'autonomy' && <AutonomyConfig userId={userId} />}

          {selectedTab === 'logs' && <AgenticLogTerminal logs={logs} />}
        </div>
      </main>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface QuickStartProps {
  userId: string
}

export function QuickStart({ userId }: QuickStartProps) {
  const [niche, setNiche] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleGenerateContent = async () => {
    if (!niche.trim()) {
      setError('Please enter a niche')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      // First, create or get a campaign
      const campaignResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${niche} Content Campaign`,
          niche: niche,
          description: `Auto-generated campaign for ${niche}`,
          target_platforms: ['meta', 'linkedin', 'x'],
        }),
      })

      if (!campaignResponse.ok) throw new Error('Failed to create campaign')
      const campaign = await campaignResponse.json()

      // Then trigger content generation
      const generationResponse = await fetch('/api/agent/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          niche: niche,
          targetPlatforms: ['meta', 'linkedin', 'x'],
        }),
      })

      if (!generationResponse.ok) throw new Error('Failed to generate content')
      const result = await generationResponse.json()

      setSuccess(`Content generated! ID: ${result.contentPieceId.slice(0, 8)}...`)
      setNiche('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('[v0] Content generation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur h-full flex flex-col">
      <div className="space-y-6 flex-1">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Quick Start</h3>
          <p className="text-sm text-muted-foreground">
            Enter your niche to generate content across the entire 5-stage pipeline
          </p>
        </div>

        <div className="space-y-3">
          <label htmlFor="niche" className="block text-sm font-medium text-foreground">
            Your Niche
          </label>
          <Input
            id="niche"
            placeholder="e.g., AI SaaS News, Digital Marketing Tips, Tech Reviews..."
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleGenerateContent()}
            disabled={isLoading}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">
            The AI will discover trends, enrich topics, write copy, generate creatives, and prepare for publishing.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-sm text-accent">{success}</p>
          </div>
        )}
      </div>

      <Button
        onClick={handleGenerateContent}
        disabled={isLoading || !niche.trim()}
        className="w-full mt-auto bg-gradient-to-r from-primary to-accent hover:opacity-90"
      >
        {isLoading ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Generating...
          </>
        ) : (
          'Start Content Pipeline'
        )}
      </Button>
    </Card>
  )
}

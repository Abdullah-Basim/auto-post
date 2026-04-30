'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { ContentPipeline } from './content-pipeline'
import { createClient } from '@/lib/supabase/client'
import type { Campaign } from '@/types'

export function CampaignCenter() {
  const [userId, setUserId] = useState('')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [niche, setNiche] = useState('')
  const [targetPlatforms, setTargetPlatforms] = useState<string[]>(['twitter', 'linkedin'])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [generationSuccess, setGenerationSuccess] = useState('')
  const supabase = createClient()

  // Load user and campaigns on mount
  useEffect(() => {
    const loadUserAndCampaigns = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          setUserId(user.id)

          // Load campaigns
          const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (!error && data) {
            setCampaigns(data)
            if (data.length > 0) {
              setSelectedCampaign(data[0])
            }
          }
        }
      } catch (error) {
        console.error('[v0] Load campaigns error:', error)
      }
    }

    loadUserAndCampaigns()
  }, [supabase])

  const handleGenerateContent = async () => {
    if (!selectedCampaign || !niche) {
      setGenerationError('Please select a campaign and enter a niche')
      return
    }

    setIsGenerating(true)
    setGenerationError('')
    setGenerationSuccess('')

    try {
      const response = await fetch('/api/agent/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          niche,
          targetPlatforms,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate content')
      }

      setGenerationSuccess(`✨ Content generated successfully! (ID: ${data.contentPieceId})`)
      setNiche('')

      // Refresh content pipeline
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      setGenerationError(message)
      console.error('[v0] Generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const togglePlatform = (platform: string) => {
    setTargetPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    )
  }

  return (
    <div className="space-y-6">
      {/* Campaign Selection */}
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-foreground mb-2">Campaign Selection</h3>
            <p className="text-sm text-muted-foreground">Choose a campaign to generate content for</p>
          </div>

          {campaigns.length > 0 ? (
            <Select
              value={selectedCampaign?.id || ''}
              onValueChange={(campaignId) => {
                const campaign = campaigns.find((c) => c.id === campaignId)
                if (campaign) setSelectedCampaign(campaign)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 border border-muted-foreground/20">
              <p className="text-sm text-muted-foreground">No campaigns found. Create one first in the Campaigns section.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Content Generation Panel */}
      {selectedCampaign && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 backdrop-blur">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">Generate Content</h3>
              <p className="text-sm text-muted-foreground">Specify a niche to run the 5-stage content pipeline</p>
            </div>

            <div className="space-y-4">
              {/* Niche Input */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Content Niche
                </label>
                <Input
                  placeholder="e.g., AI/ML, Personal Finance, Fitness, Marketing..."
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  disabled={isGenerating}
                  className="border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  What industry or topic should the content focus on?
                </p>
              </div>

              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Target Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {['twitter', 'linkedin', 'instagram', 'tiktok', 'reddit'].map((platform) => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      disabled={isGenerating}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        targetPlatforms.includes(platform)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error and Success Messages */}
              {generationError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                  {generationError}
                </motion.div>
              )}

              {generationSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm"
                >
                  {generationSuccess}
                </motion.div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerateContent}
                disabled={isGenerating || !selectedCampaign || !niche}
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {isGenerating ? (
                  <>
                    <Spinner className="mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    ✨ Generate Content
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                This will run the full 5-stage AI content pipeline using Claude 3.5 Sonnet
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Content Pipeline */}
      {selectedCampaign && <ContentPipeline fullView userId={userId} campaigns={campaigns} />}
    </div>
  )
}

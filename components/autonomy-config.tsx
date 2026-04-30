'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import type { ReplyConfig } from '@/lib/services/autonomous-replies'

interface AutonomyConfigProps {
  userId: string
}

export function AutonomyConfig({ userId }: AutonomyConfigProps) {
  const [config, setConfig] = useState<Partial<ReplyConfig>>({
    autoReplyPositive: true,
    autoReplyQuestions: false,
    autoReplyNegative: false,
    maxDailyAutoReplies: 100,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const supabase = createClient()

  // Load configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/autonomy/config')
        if (response.ok) {
          const data = await response.json()
          setConfig(data)
        }
      } catch (error) {
        console.error('[v0] Error loading autonomy config:', error)
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/autonomy/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      }
    } catch (error) {
      console.error('[v0] Error saving config:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (key: keyof ReplyConfig) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleNumericChange = (key: keyof ReplyConfig, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: Math.max(0, parseInt(value) || 0),
    }))
  }

  if (loading) {
    return <div>Loading configuration...</div>
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Autonomy Settings</h3>
          <p className="text-sm text-muted-foreground">
            Configure how the Ghost Reply Engine responds to comments automatically
          </p>
        </div>

        {/* Auto-Reply Triggers */}
        <div className="space-y-4">
          <div className="border-b border-border pb-4">
            <h4 className="font-semibold text-foreground mb-4">Auto-Reply Rules</h4>

            {/* Positive Comments */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-card/30">
              <div>
                <p className="font-medium text-foreground">Positive Comments</p>
                <p className="text-xs text-muted-foreground">Auto-respond to praise and positive feedback</p>
              </div>
              <Switch
                checked={config.autoReplyPositive || false}
                onCheckedChange={() => handleToggle('autoReplyPositive' as keyof ReplyConfig)}
              />
            </div>

            {/* Questions */}
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-card/30">
              <div>
                <p className="font-medium text-foreground">Questions</p>
                <p className="text-xs text-muted-foreground">Auto-respond to inquiries and clarifications</p>
              </div>
              <Switch
                checked={config.autoReplyQuestions || false}
                onCheckedChange={() => handleToggle('autoReplyQuestions' as keyof ReplyConfig)}
              />
            </div>

            {/* Negative Comments */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-card/30">
              <div>
                <p className="font-medium text-foreground">Negative Comments</p>
                <p className="text-xs text-muted-foreground">Auto-respond to criticism (requires manual review)</p>
              </div>
              <Switch
                checked={config.autoReplyNegative || false}
                onCheckedChange={() => handleToggle('autoReplyNegative' as keyof ReplyConfig)}
              />
            </div>
          </div>

          {/* Rate Limits */}
          <div className="border-b border-border pb-4">
            <h4 className="font-semibold text-foreground mb-4">Rate Limits</h4>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Max Daily Auto-Replies
                </label>
                <Input
                  type="number"
                  min="0"
                  max="1000"
                  value={config.maxDailyAutoReplies || 100}
                  onChange={(e) => handleNumericChange('maxDailyAutoReplies' as keyof ReplyConfig, e.target.value)}
                  className="bg-background/50 border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of autonomous replies per day (0 = unlimited)
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Max Tokens Per Reply
                </label>
                <Input
                  type="number"
                  min="50"
                  max="500"
                  value={config.maxTokensPerReply || 300}
                  onChange={(e) => handleNumericChange('maxTokensPerReply' as keyof ReplyConfig, e.target.value)}
                  className="bg-background/50 border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum length of generated replies (50-500 tokens)
                </p>
              </div>
            </div>
          </div>

          {/* Safety Notes */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-sm text-yellow-200 mb-2 font-medium">Safety Note</p>
            <p className="text-xs text-yellow-100">
              Autonomous replies are always generated by Claude and can be configured. Negative comments will
              be flagged for manual review before posting. We recommend starting with positive comments only.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
          {saveSuccess && (
            <div className="flex items-center justify-center px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-300">Saved successfully</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

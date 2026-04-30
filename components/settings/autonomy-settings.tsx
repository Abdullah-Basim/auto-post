'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export function AutonomySettings() {
  const [config, setConfig] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isLoading, setIsLoading] = useState(true)

  // Load config
  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/autonomy/config')
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      }
    } catch (error) {
      console.error('[v0] Load config error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const response = await fetch('/api/autonomy/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (response.ok) {
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      console.error('[v0] Save error:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="text-center text-muted-foreground">Loading settings...</div>
  }

  if (!config) {
    return <div className="text-center text-muted-foreground">Failed to load settings</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Autonomous Reply Settings</h2>
        <p className="text-sm text-muted-foreground">Configure automatic reply behavior</p>
      </div>

      {/* Enable Autonomy */}
      <Card>
        <CardHeader>
          <CardTitle>Enable Autonomy</CardTitle>
          <CardDescription>Allow the AI to automatically post approved replies</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="enabled"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="h-4 w-4 rounded border"
            />
            <label htmlFor="enabled" className="font-medium">
              Enable automatic replies
            </label>
            {config.enabled && <Badge className="bg-green-100 text-green-800">Active</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Reply Rules</CardTitle>
          <CardDescription>Choose which comment types should auto-reply</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: 'auto_reply_positive',
              label: 'Positive Comments',
              description: 'Automatically reply to positive feedback',
            },
            {
              key: 'auto_reply_questions',
              label: 'Questions',
              description: 'Automatically reply to questions',
            },
            {
              key: 'auto_reply_neutral',
              label: 'Neutral Comments',
              description: 'Automatically reply to neutral comments',
            },
            {
              key: 'auto_reply_negative',
              label: 'Negative Comments',
              description: 'Automatically reply to negative feedback',
            },
          ].map(({ key, label, description }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={key}
                  checked={config[key as keyof typeof config]}
                  onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                  className="h-4 w-4 rounded border"
                />
                <label htmlFor={key} className="font-medium">
                  {label}
                </label>
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
          <CardDescription>Control how many replies can be sent automatically</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxReplies">Max Replies Per Hour</Label>
            <Input
              id="maxReplies"
              type="number"
              min="1"
              max="100"
              value={config.max_replies_per_hour}
              onChange={(e) =>
                setConfig({ ...config, max_replies_per_hour: parseInt(e.target.value) })
              }
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of automatic replies that can be posted per hour
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Confidence Threshold */}
      <Card>
        <CardHeader>
          <CardTitle>Quality Threshold</CardTitle>
          <CardDescription>Only auto-reply if AI is confident in the response</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="threshold">Confidence Score ({config.skip_moderation_score * 100}%)</Label>
            <input
              id="threshold"
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={config.skip_moderation_score}
              onChange={(e) =>
                setConfig({ ...config, skip_moderation_score: parseFloat(e.target.value) })
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Only auto-post replies with at least this confidence level
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save and Status */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
        {saveStatus === 'success' && (
          <div className="rounded bg-green-100 px-3 py-2 text-sm text-green-800">
            Saved successfully
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
            Failed to save
          </div>
        )}
      </div>
    </div>
  )
}

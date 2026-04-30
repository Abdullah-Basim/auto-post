'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/lib/supabase/client'
import type { ContentPiece } from '@/types'

interface PlatformPublisherProps {
  contentPiece: ContentPiece | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface PublishResult {
  platform: string
  success: boolean
  post_id?: string
  post_url?: string
  error?: string
}

interface PlatformCredential {
  id: string
  platform_id: string
  platform_name: string
  connected: boolean
  account_name?: string
}

const PLATFORM_ICONS: Record<string, string> = {
  'x': '𝕏',
  'twitter': '𝕏',
  'linkedin': 'in',
  'meta': 'f',
  'facebook': 'f',
  'instagram': '📷',
  'tiktok': '♪',
}

const PLATFORM_COLORS: Record<string, string> = {
  'x': 'from-gray-900 to-black',
  'twitter': 'from-blue-500 to-blue-600',
  'linkedin': 'from-blue-700 to-blue-800',
  'meta': 'from-blue-600 to-purple-600',
  'facebook': 'from-blue-600 to-blue-700',
  'instagram': 'from-pink-500 to-purple-600',
  'tiktok': 'from-black to-gray-900',
}

export function PlatformPublisher({
  contentPiece,
  isOpen,
  onClose,
  onSuccess,
}: PlatformPublisherProps) {
  const [platformCredentials, setPlatformCredentials] = useState<PlatformCredential[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResults, setPublishResults] = useState<PublishResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  // Load platform credentials
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data, error } = await supabase
          .from('platform_credentials')
          .select('*')
          .eq('user_id', user.id)

        if (!error && data) {
          const credentials = data.map((cred: any) => ({
            id: cred.id,
            platform_id: cred.platform_id,
            platform_name: cred.platform_id.charAt(0).toUpperCase() + cred.platform_id.slice(1),
            connected: !!cred.access_token,
            account_name: cred.account_name,
          }))

          setPlatformCredentials(credentials)
          // Pre-select first connected platform
          if (credentials.length > 0) {
            setSelectedPlatforms([credentials[0].platform_id])
          }
        }
      } catch (error) {
        console.error('[v0] Load credentials error:', error)
      }
    }

    if (isOpen) {
      loadCredentials()
    }
  }, [isOpen, supabase])

  const handlePublish = async () => {
    if (!contentPiece || selectedPlatforms.length === 0) {
      setError('Please select at least one platform')
      return
    }

    setIsPublishing(true)
    setError('')
    setPublishResults([])

    try {
      const response = await fetch('/api/platforms/publish-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPieceId: contentPiece.id,
          platforms: selectedPlatforms,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Publishing failed')
      }

      setPublishResults(data.results)
      setShowResults(true)

      // Call success callback after delay
      setTimeout(() => {
        if (onSuccess) onSuccess()
      }, 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publishing failed'
      setError(message)
      console.error('[v0] Publish error:', err)
    } finally {
      setIsPublishing(false)
    }
  }

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    )
  }

  if (!contentPiece || !isOpen) return null

  const connectedPlatforms = platformCredentials.filter((p) => p.connected)
  const successCount = publishResults.filter((r) => r.success).length
  const failureCount = publishResults.filter((r) => !r.success).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <Card className="m-0 border-0 rounded-0 bg-gradient-to-r from-primary/10 to-accent/10 p-6">
          <h2 className="text-2xl font-bold text-foreground">Publish Content</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select platforms to publish this content
          </p>
        </Card>

        <div className="p-6 space-y-6">
          {/* Content Preview */}
          <div className="p-4 rounded-lg bg-card/50 border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">Content Preview</h3>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {contentPiece.source_topics?.[0] || 'Generated content'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Quality: {((contentPiece.quality_score || 0) * 100).toFixed(0)}%
            </p>
          </div>

          {/* Platform Selection */}
          {!showResults && (
            <>
              {connectedPlatforms.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Connected Platforms</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {connectedPlatforms.map((platform) => (
                      <motion.button
                        key={platform.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => togglePlatform(platform.platform_id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          selectedPlatforms.includes(platform.platform_id)
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card/50 hover:bg-card'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">{platform.platform_name}</p>
                            {platform.account_name && (
                              <p className="text-xs text-muted-foreground mt-1">
                                @{platform.account_name}
                              </p>
                            )}
                          </div>
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              selectedPlatforms.includes(platform.platform_id)
                                ? 'bg-primary border-primary'
                                : 'border-border'
                            }`}
                          >
                            {selectedPlatforms.includes(platform.platform_id) && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    No platforms connected. Connect platforms in Settings first.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Publish Button */}
              <div className="flex gap-3">
                <Button
                  onClick={handlePublish}
                  disabled={isPublishing || selectedPlatforms.length === 0}
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  {isPublishing ? (
                    <>
                      <Spinner className="mr-2" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      📤 Publish to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  disabled={isPublishing}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}

          {/* Results */}
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-lg bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Publishing Complete</h3>
                  <div className="flex gap-3">
                    {successCount > 0 && (
                      <Badge className="bg-green-100 text-green-800">
                        {successCount} successful
                      </Badge>
                    )}
                    {failureCount > 0 && (
                      <Badge className="bg-red-100 text-red-800">
                        {failureCount} failed
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {publishResults.map((result, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-3 rounded border-l-4 ${
                        result.success
                          ? 'bg-green-50 border-l-green-500'
                          : 'bg-red-50 border-l-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{result.platform}</p>
                          {result.success && result.post_url && (
                            <a
                              href={result.post_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-accent hover:underline"
                            >
                              View post →
                            </a>
                          )}
                          {!result.success && result.error && (
                            <p className="text-xs text-red-700">{result.error}</p>
                          )}
                        </div>
                        <span className="text-lg">
                          {result.success ? '✓' : '✕'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowResults(false)
                    setPublishResults([])
                    onClose()
                  }}
                  className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

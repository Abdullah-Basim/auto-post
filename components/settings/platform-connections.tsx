'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PlatformCredential {
  id: string
  platform_id: string
  platform_name: string
  token_preview: string
  created_at: string
  status: string
}

export function PlatformConnections() {
  const [credentials, setCredentials] = useState<PlatformCredential[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCredentials()
  }, [])

  const fetchCredentials = async () => {
    try {
      const response = await fetch('/api/platforms/credentials')
      if (response.ok) {
        const data = await response.json()
        setCredentials(data)
      }
    } catch (error) {
      console.error('[v0] Fetch credentials error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPlatformIcon = (platformId: string) => {
    const icons: Record<string, string> = {
      meta: '🔵',
      facebook: '🔵',
      instagram: '📸',
      linkedin: '💼',
      x: '𝕏',
      twitter: '𝕏',
      tiktok: '🎵',
    }
    return icons[platformId.toLowerCase()] || '🔗'
  }

  const handleConnect = (platform: string) => {
    // In a real app, this would start an OAuth flow
    console.log(`[v0] Connecting to ${platform}`)
  }

  const handleDisconnect = async (credentialId: string) => {
    try {
      // API to disconnect would go here
      setCredentials(credentials.filter((c) => c.id !== credentialId))
    } catch (error) {
      console.error('[v0] Disconnect error:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Connected Platforms</h2>
        <p className="text-sm text-muted-foreground">Manage your social media integrations</p>
      </div>

      {isLoading && <div className="text-center text-muted-foreground">Loading...</div>}

      {!isLoading && (
        <>
          {/* Connected Platforms */}
          {credentials.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Active Connections</h3>
              {credentials.map((cred) => (
                <Card key={cred.id}>
                  <CardContent className="flex items-center justify-between pt-6">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getPlatformIcon(cred.platform_id)}</span>
                      <div>
                        <p className="font-medium">{cred.platform_name}</p>
                        <p className="text-xs text-muted-foreground">{cred.token_preview}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(cred.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Available Platforms to Connect */}
          <div>
            <h3 className="mb-3 font-semibold">Available Platforms</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { id: 'meta', name: 'Facebook/Instagram', icon: '🔵' },
                { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
                { id: 'x', name: 'X (Twitter)', icon: '𝕏' },
                { id: 'tiktok', name: 'TikTok', icon: '🎵' },
              ].map((platform) => {
                const isConnected = credentials.some(
                  (c) => c.platform_id === platform.id
                )

                if (isConnected) return null

                return (
                  <Card key={platform.id}>
                    <CardContent className="flex items-center justify-between pt-6">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{platform.icon}</span>
                        <p className="font-medium">{platform.name}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleConnect(platform.id)}
                      >
                        Connect
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

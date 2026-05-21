'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface PublishedPost {
  id: string
  platform: string
  post_id: string
  post_url: string
  published_at: string
  views?: number
  likes?: number
  comments?: number
  shares?: number
}

const PLATFORM_COLORS: Record<string, string> = {
  'x': 'from-black to-gray-800',
  'twitter': 'from-blue-500 to-blue-600',
  'linkedin': 'from-blue-700 to-blue-800',
  'meta': 'from-blue-600 to-purple-600',
  'facebook': 'from-blue-600 to-blue-700',
  'instagram': 'from-pink-500 to-purple-600',
}

export function PublishingAnalytics() {
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalPublished: 0,
    totalViews: 0,
    totalEngagement: 0,
    topPlatform: '',
  })
  const supabase = createClient()

  useEffect(() => {
    const loadPublishedPosts = async () => {
      try {
        setIsLoading(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return

        const { data, error } = await supabase
          .from('published_posts')
          .select('*')
          .eq('user_id', user.id)
          .order('published_at', { ascending: false })
          .limit(10)

        if (!error && data) {
          setPublishedPosts(data)

          // Calculate stats
          const totalViews = data.reduce((sum, p) => sum + (p.views || 0), 0)
          const totalEngagement = data.reduce(
            (sum, p) => sum + ((p.likes || 0) + (p.comments || 0) + (p.shares || 0)),
            0
          )

          // Find top platform
          const platformCounts = data.reduce(
            (acc, p) => {
              acc[p.platform] = (acc[p.platform] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          )
          const topPlatform = (Object.entries(platformCounts) as Array<[string, number]>).sort(
            ([, a], [, b]) => b - a
          )[0]?.[0] || ''

          setStats({
            totalPublished: data.length,
            totalViews,
            totalEngagement,
            topPlatform,
          })
        }
      } catch (error) {
        console.error('[v0] Load analytics error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPublishedPosts()
  }, [supabase])

  if (isLoading) {
    return (
      <Card className="p-6 bg-card/50">
        <p className="text-muted-foreground text-center">Loading analytics...</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
        >
          <p className="text-xs text-muted-foreground mb-1">Total Published</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalPublished}</p>
          <p className="text-xs text-muted-foreground mt-2">posts across all platforms</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
        >
          <p className="text-xs text-muted-foreground mb-1">Total Views</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalViews.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-2">across published posts</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20"
        >
          <p className="text-xs text-muted-foreground mb-1">Total Engagement</p>
          <p className="text-2xl font-bold text-foreground">{stats.totalEngagement.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-2">likes, comments, shares</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
        >
          <p className="text-xs text-muted-foreground mb-1">Top Platform</p>
          <p className="text-2xl font-bold text-foreground capitalize">{stats.topPlatform || 'N/A'}</p>
          <p className="text-xs text-muted-foreground mt-2">most active platform</p>
        </motion.div>
      </div>

      {/* Recent Posts */}
      <Card className="p-6 bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-foreground">Recently Published</h3>

          {publishedPosts.length > 0 ? (
            <div className="space-y-3">
              {publishedPosts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 rounded-lg border border-border bg-card/30 hover:bg-card/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          className={`bg-gradient-to-r ${PLATFORM_COLORS[post.platform.toLowerCase()] || 'from-gray-500 to-gray-600'} text-white`}
                        >
                          {post.platform}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(post.published_at).toLocaleDateString()} at{' '}
                          {new Date(post.published_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-3 mt-3">
                        {post.views !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Views</p>
                            <p className="font-bold text-foreground">{post.views || 0}</p>
                          </div>
                        )}
                        {post.likes !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Likes</p>
                            <p className="font-bold text-foreground">{post.likes || 0}</p>
                          </div>
                        )}
                        {post.comments !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Comments</p>
                            <p className="font-bold text-foreground">{post.comments || 0}</p>
                          </div>
                        )}
                        {post.shares !== undefined && (
                          <div>
                            <p className="text-xs text-muted-foreground">Shares</p>
                            <p className="font-bold text-foreground">{post.shares || 0}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {post.post_url && (
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded hover:bg-primary/10 transition-colors"
                      >
                        View Post →
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No posts published yet. Generate and publish content to see them here.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

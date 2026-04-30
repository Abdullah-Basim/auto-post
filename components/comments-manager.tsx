'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useSocket } from '@/hooks/use-socket'
import type { Comment, Reply } from '@/types'
import { motion } from 'framer-motion'

interface CommentsManagerProps {
  userId: string
  postId?: string
}

export function CommentsManager({ userId, postId }: CommentsManagerProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [autonomousMode, setAutonomousMode] = useState(false)
  
  const supabase = createClient()
  const { emit, on } = useSocket({ userId })

  // Load comments from database
  const loadComments = useCallback(async () => {
    if (!userId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('[v0] Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  // Load comments on mount
  useEffect(() => {
    loadComments()
  }, [loadComments])

  // Subscribe to real-time comment updates
  useEffect(() => {
    const unsubscribe = on('comment:new', (comment: Comment) => {
      setComments((prev) => [comment, ...prev])
    })

    return unsubscribe
  }, [on])

  // Subscribe to comment updates
  useEffect(() => {
    const unsubscribe = on('comments:updated', () => {
      loadComments()
    })

    return unsubscribe
  }, [on, loadComments])

  // Handle reply submission
  const handleReplySubmit = async (commentId: string) => {
    if (!replyText.trim()) return

    try {
      setIsSubmittingReply(true)

      // Emit via socket for real-time handling
      emit('reply:submit', {
        commentId,
        replyText,
        isAutonomous: autonomousMode,
      })

      setReplyText('')
      setSelectedCommentId(null)
    } catch (error) {
      console.error('[v0] Error submitting reply:', error)
    } finally {
      setIsSubmittingReply(false)
    }
  }

  // Group comments by sentiment
  const commentsBysentiment = {
    positive: comments.filter((c) => c.sentiment === 'positive'),
    neutral: comments.filter((c) => c.sentiment === 'neutral'),
    negative: comments.filter((c) => c.sentiment === 'negative'),
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-card to-card/50 border border-border/50 backdrop-blur">
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-2">Comments Manager</h3>
          <p className="text-sm text-muted-foreground">
            {comments.length} comments total • Auto-organized by sentiment
          </p>
        </div>

        {/* Sentiment Tabs */}
        <div className="flex gap-2 border-b border-border">
          {Object.entries(commentsBysentiment).map(([sentiment, items]) => (
            <button
              key={sentiment}
              className="px-4 py-2 text-sm font-medium border-b-2 transition-colors"
              style={{
                borderColor: items.length > 0 ? 'hsl(var(--accent))' : 'transparent',
                color: items.length > 0 ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
              }}
            >
              {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} ({items.length})
            </button>
          ))}
        </div>

        {/* Comments List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No comments yet</p>
            <p className="text-xs text-muted-foreground">Comments from your posts will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border border-border bg-card/30 hover:bg-card/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    {comment.commenter_avatar_url && (
                      <img
                        src={comment.commenter_avatar_url}
                        alt={comment.commenter_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-foreground">{comment.commenter_name}</p>
                        <Badge
                          variant="outline"
                          className={
                            comment.sentiment === 'positive'
                              ? 'bg-green-500/20 text-green-300 border-green-500/30'
                              : comment.sentiment === 'negative'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          }
                        >
                          {comment.sentiment}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-12 bg-muted rounded-full h-1.5">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${(comment.sentiment_score || 0.5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Comment Text */}
                <p className="text-sm text-foreground mb-4 line-clamp-3">{comment.comment_text}</p>

                {/* Reply Section */}
                {selectedCommentId === comment.id ? (
                  <div className="space-y-3">
                    <Input
                      placeholder="Type your reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="bg-background/50 border-border"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReplySubmit(comment.id)}
                        disabled={!replyText.trim() || isSubmittingReply}
                        className="flex-1"
                      >
                        {isSubmittingReply ? 'Submitting...' : 'Submit Reply'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCommentId(null)
                          setReplyText('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAutonomousMode(!autonomousMode)}
                        className={autonomousMode ? 'bg-accent/20' : ''}
                      >
                        {autonomousMode ? 'Auto' : 'Manual'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-border hover:bg-card"
                    onClick={() => setSelectedCommentId(comment.id)}
                  >
                    Reply
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useCommentManagement } from '@/hooks/use-comment-management'
import { useRealtime } from '@/hooks/use-realtime'
import { CommentCard } from './comment-card'

export function CommentDashboard() {
  const {
    comments,
    isLoading,
    error,
    filterBySentiment,
    filterHasReply,
    fetchComments,
    setFilterBySentiment,
    setFilterHasReply,
    getSentimentSummary,
  } = useCommentManagement()

  const [searchTerm, setSearchTerm] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Setup realtime updates
  useRealtime((message) => {
    if (message.type === 'comment_received') {
      console.log('[v0] New comment received:', message.data)
      fetchComments()
    }
  })

  // Initial fetch and setup auto-refresh
  useEffect(() => {
    fetchComments()

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchComments()
      }, 10000) // Refresh every 10 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh, filterBySentiment, filterHasReply])

  const sentimentSummary = getSentimentSummary()

  const filteredComments = comments.filter((comment) =>
    comment.comment_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comment.commenter_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Comments</h1>
          <p className="text-sm text-muted-foreground">Manage and reply to comments across all platforms</p>
        </div>
        <Button onClick={() => fetchComments()} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Sentiment Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Positive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentimentSummary.positive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentimentSummary.question}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Neutral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentimentSummary.neutral}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Negative</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sentimentSummary.negative}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search</label>
            <Input
              placeholder="Search by comment or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterBySentiment === null ? 'default' : 'outline'}
              onClick={() => setFilterBySentiment(null)}
            >
              All Sentiments
            </Button>
            {['positive', 'question', 'neutral', 'negative'].map((sentiment) => (
              <Button
                key={sentiment}
                variant={filterBySentiment === sentiment ? 'default' : 'outline'}
                onClick={() => setFilterBySentiment(sentiment as any)}
                className="capitalize"
              >
                {sentiment}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterHasReply === null ? 'default' : 'outline'}
              onClick={() => setFilterHasReply(null)}
            >
              All Status
            </Button>
            <Button
              variant={filterHasReply === true ? 'default' : 'outline'}
              onClick={() => setFilterHasReply(true)}
            >
              Has Reply
            </Button>
            <Button
              variant={filterHasReply === false ? 'default' : 'outline'}
              onClick={() => setFilterHasReply(false)}
            >
              Needs Reply
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border"
            />
            <label htmlFor="autoRefresh" className="text-sm">
              Auto-refresh every 10 seconds
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading && !comments.length && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && filteredComments.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                {comments.length === 0 ? 'No comments yet' : 'No comments match your filters'}
              </p>
            </CardContent>
          </Card>
        )}

        {filteredComments.map((comment) => (
          <CommentCard key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import type { Comment, Reply } from '@/types'

export interface CommentWithReply extends Comment {
  replies?: Reply[]
}

export function useCommentManagement() {
  const [comments, setComments] = useState<CommentWithReply[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterBySentiment, setFilterBySentiment] = useState<string | null>(null)
  const [filterHasReply, setFilterHasReply] = useState<boolean | null>(null)

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filterBySentiment) params.append('sentiment', filterBySentiment)
      if (filterHasReply !== null) params.append('hasReply', filterHasReply.toString())

      const response = await fetch(`/api/comments?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch comments')

      const data = await response.json()
      setComments(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch comments'
      setError(message)
      console.error('[v0] Fetch comments error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filterBySentiment, filterHasReply])

  // Generate reply for a comment
  const generateReply = useCallback(
    async (commentId: string, commentText: string, postContext?: string) => {
      try {
        const response = await fetch('/api/agent/generate-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commentId,
            commentText,
            postContext,
          }),
        })

        if (!response.ok) throw new Error('Failed to generate reply')
        return await response.json()
      } catch (err) {
        console.error('[v0] Generate reply error:', err)
        throw err
      }
    },
    []
  )

  // Approve and post reply
  const approveReply = useCallback(
    async (replyId: string, finalReply: string, shouldPost = false) => {
      try {
        const response = await fetch(`/api/replies/${replyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            final_reply: finalReply,
            is_approved: true,
            approved_by_user: true,
            status: shouldPost ? 'approved' : 'pending',
          }),
        })

        if (!response.ok) throw new Error('Failed to approve reply')
        return await response.json()
      } catch (err) {
        console.error('[v0] Approve reply error:', err)
        throw err
      }
    },
    []
  )

  // Enable autonomous mode for a comment
  const enableAutonomy = useCallback(async (replyId: string) => {
    try {
      const response = await fetch(`/api/replies/${replyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_autonomous: true,
          status: 'approved',
        }),
      })

      if (!response.ok) throw new Error('Failed to enable autonomy')
      return await response.json()
    } catch (err) {
      console.error('[v0] Enable autonomy error:', err)
      throw err
    }
  }, [])

  // Get filtered comments
  const getFilteredComments = useCallback(() => {
    return comments.filter((comment) => {
      if (filterBySentiment && comment.sentiment !== filterBySentiment) return false
      if (filterHasReply !== null && comment.has_reply !== filterHasReply) return false
      return true
    })
  }, [comments, filterBySentiment, filterHasReply])

  // Get sentiment summary
  const getSentimentSummary = useCallback(() => {
    return {
      positive: comments.filter((c) => c.sentiment === 'positive').length,
      negative: comments.filter((c) => c.sentiment === 'negative').length,
      neutral: comments.filter((c) => c.sentiment === 'neutral').length,
      question: comments.filter((c) => c.sentiment === 'question').length,
      total: comments.length,
    }
  }, [comments])

  return {
    comments: getFilteredComments(),
    allComments: comments,
    isLoading,
    error,
    filterBySentiment,
    filterHasReply,
    fetchComments,
    generateReply,
    approveReply,
    enableAutonomy,
    setFilterBySentiment,
    setFilterHasReply,
    getSentimentSummary,
  }
}

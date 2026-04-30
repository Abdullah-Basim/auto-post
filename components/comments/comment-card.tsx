'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useCommentManagement } from '@/hooks/use-comment-management'
import type { Comment } from '@/types'

interface CommentCardProps {
  comment: Comment & { replies?: any[] }
}

export function CommentCard({ comment }: CommentCardProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showReplyEditor, setShowReplyEditor] = useState(false)
  const [generatedReplies, setGeneratedReplies] = useState<any[]>([])
  const [customReply, setCustomReply] = useState('')

  const { generateReply, approveReply } = useCommentManagement()

  const handleGenerateReply = async () => {
    setIsGenerating(true)
    try {
      const result = await generateReply(
        comment.id,
        comment.comment_text,
        `Post about ${comment.platform_id}`
      )

      if (result.reply) {
        setGeneratedReplies([result.reply, ...result.reply.alternatives])
        setShowReplyEditor(true)
      }
    } catch (error) {
      console.error('[v0] Generate reply error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApproveReply = async (replyText: string) => {
    try {
      const reply = generatedReplies[0]
      if (reply && reply.id) {
        await approveReply(reply.id, replyText, true)
        setShowReplyEditor(false)
        setGeneratedReplies([])
      }
    } catch (error) {
      console.error('[v0] Approve reply error:', error)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    const colors: Record<string, string> = {
      positive: 'bg-green-100 text-green-800',
      negative: 'bg-red-100 text-red-800',
      neutral: 'bg-gray-100 text-gray-800',
      question: 'bg-blue-100 text-blue-800',
    }
    return colors[sentiment] || 'bg-gray-100 text-gray-800'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{comment.commenter_name}</p>
            {comment.commenter_handle && (
              <p className="text-sm text-muted-foreground">@{comment.commenter_handle}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(comment.created_at).toLocaleDateString()} •{' '}
            {comment.platform_id && <Badge variant="secondary">{comment.platform_id}</Badge>}
          </p>
        </div>
        <Badge className={getSentimentColor(comment.sentiment || 'neutral')}>
          {comment.sentiment || 'neutral'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Comment Text */}
        <p className="text-sm leading-relaxed">{comment.comment_text}</p>

        {/* Generated Replies */}
        {generatedReplies.length > 0 && !showReplyEditor && (
          <div className="space-y-3 rounded-lg bg-blue-50 p-3">
            <p className="text-xs font-medium text-blue-900">Suggested Replies:</p>
            {generatedReplies.slice(0, 3).map((reply, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCustomReply(reply)
                  setShowReplyEditor(true)
                }}
                className="block rounded bg-white p-2 text-left text-sm hover:bg-blue-100"
              >
                {typeof reply === 'string' ? reply : reply.suggested_reply}
              </button>
            ))}
          </div>
        )}

        {/* Reply Editor */}
        {showReplyEditor && (
          <div className="space-y-2 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium">Your Reply:</p>
            <Textarea
              value={customReply}
              onChange={(e) => setCustomReply(e.target.value)}
              placeholder="Type your reply here..."
              className="resize-none"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleApproveReply(customReply)}
              >
                Post Reply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowReplyEditor(false)
                  setCustomReply('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showReplyEditor && generatedReplies.length === 0 && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleGenerateReply}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? 'Generating...' : 'Generate Reply'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

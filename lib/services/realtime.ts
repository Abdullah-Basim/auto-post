/**
 * Real-time event handling for comment updates, replies, and notifications
 * Uses Server-Sent Events for client-server communication
 */

interface RealtimeMessage {
  type:
    | 'comment_received'
    | 'reply_generated'
    | 'reply_posted'
    | 'post_published'
    | 'sentiment_analysis'
    | 'notification'
  timestamp: string
  data: any
}

/**
 * Event emitter for real-time updates
 * In production, would use WebSocket server or service like Socket.io
 */
class RealtimeEventEmitter {
  private subscribers: Map<
    string,
    (message: RealtimeMessage) => void
  > = new Map()

  /**
   * Subscribe to events for a user
   */
  subscribe(userId: string, callback: (message: RealtimeMessage) => void): () => void {
    this.subscribers.set(userId, callback)

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(userId)
    }
  }

  /**
   * Emit event to user
   */
  emit(userId: string, message: RealtimeMessage): void {
    const callback = this.subscribers.get(userId)
    if (callback) {
      callback(message)
    }
  }

  /**
   * Broadcast to all subscribers
   */
  broadcast(message: RealtimeMessage): void {
    this.subscribers.forEach((callback) => {
      callback(message)
    })
  }
}

export const realtimeEmitter = new RealtimeEventEmitter()

/**
 * Emit comment received event
 */
export function emitCommentReceived(
  userId: string,
  comment: {
    id: string
    platform: string
    commenter: string
    text: string
    sentiment: string
  }
): void {
  realtimeEmitter.emit(userId, {
    type: 'comment_received',
    timestamp: new Date().toISOString(),
    data: comment,
  })
}

/**
 * Emit reply generated event
 */
export function emitReplyGenerated(
  userId: string,
  reply: {
    id: string
    comment_id: string
    suggested_reply: string
    alternatives: string[]
    sentiment: string
  }
): void {
  realtimeEmitter.emit(userId, {
    type: 'reply_generated',
    timestamp: new Date().toISOString(),
    data: reply,
  })
}

/**
 * Emit reply posted event
 */
export function emitReplyPosted(
  userId: string,
  post: {
    id: string
    reply_id: string
    platform: string
    post_url: string
    status: string
  }
): void {
  realtimeEmitter.emit(userId, {
    type: 'reply_posted',
    timestamp: new Date().toISOString(),
    data: post,
  })
}

/**
 * Emit post published event
 */
export function emitPostPublished(
  userId: string,
  post: {
    id: string
    platforms: string[]
    status: string
    published_at: string
  }
): void {
  realtimeEmitter.emit(userId, {
    type: 'post_published',
    timestamp: new Date().toISOString(),
    data: post,
  })
}

/**
 * Emit sentiment analysis result
 */
export function emitSentimentAnalysis(
  userId: string,
  analysis: {
    comment_id: string
    sentiment: string
    score: number
    emotion: string
  }
): void {
  realtimeEmitter.emit(userId, {
    type: 'sentiment_analysis',
    timestamp: new Date().toISOString(),
    data: analysis,
  })
}

/**
 * Emit notification
 */
export function emitNotification(
  userId: string,
  notification: {
    id: string
    title: string
    message: string
    level: 'info' | 'warning' | 'error' | 'success'
    action?: string
  }
): void {
  realtimeEmitter.emit(userId, {
    type: 'notification',
    timestamp: new Date().toISOString(),
    data: notification,
  })
}

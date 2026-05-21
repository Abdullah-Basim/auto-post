import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { createClient } from '@/lib/supabase/server'
import { updateAgentState, getAgentState, createAgentLog } from '@/lib/db/queries'
import type { AgentState, Comment } from '@/types'

export class WebSocketServer {
  private io: SocketIOServer
  private userConnections: Map<string, Set<string>> = new Map()
  private agentStatusIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    })

    this.io.on('connection', (socket) => this.handleConnection(socket))
  }

  private handleConnection(socket: Socket) {
    const userId = socket.handshake.auth.userId as string

    if (!userId) {
      socket.disconnect(true)
      return
    }

    console.log(`[v0] User ${userId} connected via WebSocket`)

    // Track user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set())
    }
    this.userConnections.get(userId)!.add(socket.id)

    // Join user room
    socket.join(`user:${userId}`)

    // Setup event listeners
    socket.on('agent:start', (data) => this.handleAgentStart(socket, userId, data))
    socket.on('agent:update-status', (data) => this.handleAgentStatusUpdate(socket, userId, data))
    socket.on('comments:fetch', (data) => this.handleCommentsFetch(socket, userId, data))
    socket.on('reply:submit', (data) => this.handleReplySubmit(socket, userId, data))
    socket.on('disconnect', () => this.handleDisconnect(socket, userId))
  }

  private async handleAgentStart(socket: Socket, userId: string, data: any) {
    try {
      const { campaignId } = data

      // Update agent state
      await updateAgentState(userId, {
        current_status: 'scanning',
        current_action: 'Initiating content generation pipeline',
        current_campaign_id: campaignId,
        stage_progress: 0,
        started_at: new Date().toISOString(),
      })

      // Emit to user
      this.io.to(`user:${userId}`).emit('agent:started', {
        status: 'scanning',
        campaignId,
      })

      // Log activity
      await createAgentLog({
        user_id: userId,
        campaign_id: campaignId,
        agent_action: 'pipeline_started',
        log_level: 'info',
        message: 'Content generation pipeline started',
      })
    } catch (error) {
      console.error('[v0] Error starting agent:', error)
      socket.emit('error', { message: 'Failed to start agent' })
    }
  }

  private async handleAgentStatusUpdate(socket: Socket, userId: string, data: any) {
    try {
      const { status, action, progress, stage, estimatedCompletion } = data

      await updateAgentState(userId, {
        current_status: status,
        current_action: action,
        stage_progress: progress,
        estimated_completion_at: estimatedCompletion,
      })

      this.io.to(`user:${userId}`).emit('agent:status-updated', {
        status,
        action,
        progress,
        stage,
      })
    } catch (error) {
      console.error('[v0] Error updating agent status:', error)
    }
  }

  private async handleCommentsFetch(socket: Socket, userId: string, data: any) {
    try {
      const { postId } = data
      const supabase = await createClient()

      const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('user_id', userId)
        .eq('scheduled_post_id', postId)
        .order('created_at', { ascending: false })

      if (error) throw error

      socket.emit('comments:fetched', { comments })
    } catch (error) {
      console.error('[v0] Error fetching comments:', error)
      socket.emit('error', { message: 'Failed to fetch comments' })
    }
  }

  private async handleReplySubmit(socket: Socket, userId: string, data: any) {
    try {
      const { commentId, replyText, isAutonomous } = data
      const supabase = await createClient()

      const { error: insertError } = await supabase.from('replies').insert({
        user_id: userId,
        comment_id: commentId,
        suggested_reply: replyText,
        final_reply: replyText,
        is_approved: true,
        is_autonomous: isAutonomous,
        approved_by_user: !isAutonomous,
        status: 'pending',
      })

      if (insertError) throw insertError

      socket.emit('reply:submitted', { commentId })
      this.io.to(`user:${userId}`).emit('comments:updated')
    } catch (error) {
      console.error('[v0] Error submitting reply:', error)
      socket.emit('error', { message: 'Failed to submit reply' })
    }
  }

  private handleDisconnect(socket: Socket, userId: string) {
    console.log(`[v0] User ${userId} disconnected`)

    const connections = this.userConnections.get(userId)
    if (connections) {
      connections.delete(socket.id)
      if (connections.size === 0) {
        this.userConnections.delete(userId)
      }
    }

    // Clear agent status interval if no more connections
    if (!this.userConnections.has(userId) && this.agentStatusIntervals.has(userId)) {
      clearInterval(this.agentStatusIntervals.get(userId))
      this.agentStatusIntervals.delete(userId)
    }
  }

  // Public methods for server-side events
  public async broadcastAgentStatus(userId: string, status: Partial<AgentState>) {
    this.io.to(`user:${userId}`).emit('agent:status', status)
  }

  public async broadcastNewComment(userId: string, comment: Comment) {
    this.io.to(`user:${userId}`).emit('comment:new', comment)
  }

  public async broadcastPublishSuccess(userId: string, postId: string, platforms: string[]) {
    this.io.to(`user:${userId}`).emit('publish:success', {
      postId,
      platforms,
      timestamp: new Date().toISOString(),
    })
  }

  public getIO() {
    return this.io
  }

  public isUserConnected(userId: string): boolean {
    return this.userConnections.has(userId) && this.userConnections.get(userId)!.size > 0
  }
}

let socketServer: WebSocketServer | null = null

export function getSocketServer(httpServer?: HTTPServer): WebSocketServer {
  if (!socketServer && httpServer) {
    socketServer = new WebSocketServer(httpServer)
  }
  return socketServer!
}

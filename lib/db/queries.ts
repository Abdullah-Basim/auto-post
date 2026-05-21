import { createClient } from '@/lib/supabase/server'
import type { Campaign, ContentPiece, PlatformCredential, ScheduledPost, Comment, Reply, AgentLog, AgentState } from '@/types'

/**
 * Campaign Queries
 */
export async function getCampaigns() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Campaign[]
}

export async function getCampaignById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Campaign
}

export async function createCampaign(campaign: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .insert([campaign])
    .select()
    .single()

  if (error) throw error
  return data as Campaign
}

export async function updateCampaign(id: string, updates: Partial<Campaign>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Campaign
}

/**
 * Content Piece Queries
 */
export async function getContentPieces(campaignId?: string) {
  const supabase = await createClient()
  let query = supabase.from('content_pieces').select('*')

  if (campaignId) {
    query = query.eq('campaign_id', campaignId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data as ContentPiece[]
}

export async function getContentPieceById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_pieces')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as ContentPiece
}

export async function createContentPiece(piece: Omit<ContentPiece, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_pieces')
    .insert([piece])
    .select()
    .single()

  if (error) throw error
  return data as ContentPiece
}

export async function updateContentPiece(id: string, updates: Partial<ContentPiece>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('content_pieces')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ContentPiece
}

/**
 * Platform Credentials Queries
 */
export async function getPlatformCredentials() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('platform_credentials')
    .select('id, platform_id, account_handle, is_active, health_status, last_synced_at, created_at')
    .eq('is_active', true)

  if (error) throw error
  return data
}

export async function storePlatformCredential(credential: Omit<PlatformCredential, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('platform_credentials')
    .insert([credential])
    .select()
    .single()

  if (error) throw error
  return data as PlatformCredential
}

/**
 * Scheduled Posts Queries
 */
export async function getScheduledPosts(status?: string) {
  const supabase = await createClient()
  let query = supabase.from('scheduled_posts').select('*')

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.order('scheduled_publish_at', { ascending: true })

  if (error) throw error
  return data as ScheduledPost[]
}

export async function createScheduledPost(post: Omit<ScheduledPost, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert([post])
    .select()
    .single()

  if (error) throw error
  return data as ScheduledPost
}

/**
 * Comments Queries
 */
export async function getComments(filters?: { sentiment?: string; has_reply?: boolean }) {
  const supabase = await createClient()
  let query = supabase.from('comments').select('*')

  if (filters?.sentiment) {
    query = query.eq('sentiment', filters.sentiment)
  }

  if (filters?.has_reply !== undefined) {
    query = query.eq('has_reply', filters.has_reply)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data as Comment[]
}

/**
 * Replies Queries
 */
export async function createReply(reply: Omit<Reply, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('replies')
    .insert([reply])
    .select()
    .single()

  if (error) throw error
  return data as Reply
}

export async function updateReply(id: string, updates: Partial<Reply>) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('replies')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Reply
}

/**
 * Agent State Queries
 */
export async function getAgentState() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_state')
    .select('*')
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as AgentState | null
}

export async function updateAgentState(
  userIdOrUpdates: string | Partial<AgentState>,
  maybeUpdates?: Partial<AgentState>
) {
  // Support both call styles:
  //   updateAgentState(updates)           — uses RLS-scoped client
  //   updateAgentState(userId, updates)   — explicit user filter (used by socket server)
  const updates =
    typeof userIdOrUpdates === 'string' ? maybeUpdates ?? {} : userIdOrUpdates
  const userId = typeof userIdOrUpdates === 'string' ? userIdOrUpdates : undefined

  const supabase = await createClient()
  const row = { ...updates, updated_at: new Date().toISOString() }

  if (userId) {
    const { data, error } = await supabase
      .from('agent_state')
      .upsert({ user_id: userId, ...row }, { onConflict: 'user_id' })
      .select()
      .single()
    if (error) throw error
    return data as AgentState
  }

  const { data, error } = await supabase
    .from('agent_state')
    .update(row)
    .select()
    .single()
  if (error) throw error
  return data as AgentState
}

/**
 * Agent Logs Queries
 */
type CreateAgentLogInput =
  Pick<AgentLog, 'user_id' | 'agent_action' | 'log_level'> &
  Partial<Pick<AgentLog, 'campaign_id' | 'content_piece_id' | 'message' | 'raw_json'>>

export async function createAgentLog(log: CreateAgentLogInput) {
  const supabase = await createClient()
  const row = {
    campaign_id: null,
    content_piece_id: null,
    message: null,
    raw_json: {},
    ...log,
  }
  const { data, error } = await supabase
    .from('agent_logs')
    .insert([row])
    .select()
    .single()

  if (error) throw error
  return data as AgentLog
}

export async function getAgentLogs(limit = 100) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as AgentLog[]
}

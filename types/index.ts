/**
 * Autopost Type Definitions
 */

export type Platform = 'meta' | 'linkedin' | 'x' | 'tiktok'

export interface PlatformInfo {
  id: string
  name: Platform
  display_name: string
  icon_url: string | null
  api_base_url: string
  created_at: string
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  subscription_tier: string
  daily_content_limit: number
  monthly_api_calls_limit: number
  created_at: string
  updated_at: string
}

export interface PlatformCredential {
  id: string
  user_id: string
  platform_id: string
  account_handle: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  is_active: boolean
  health_status: 'healthy' | 'warning' | 'error'
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  user_id: string
  name: string
  description: string | null
  niche: string
  status: 'active' | 'paused' | 'archived'
  auto_publish: boolean
  target_platforms: string[]
  created_at: string
  updated_at: string
}

export type PipelineStage = 'source_discovery' | 'topic_enrichment' | 'copywriting' | 'creative_generation' | 'platform_approval'

export interface ContentPiece {
  id: string
  user_id: string
  campaign_id: string
  stage: PipelineStage
  stage_progress: number
  source_topics: string[]
  enriched_content: string | null
  copywriting: string | null
  creative_brief: string | null
  creative_assets: any[] // JSON
  reasoning: any // JSON with AI reasoning
  source_insights: string[]
  status: 'in_progress' | 'completed' | 'failed'
  quality_score: number
  created_at: string
  updated_at: string
}

export interface ScheduledPost {
  id: string
  user_id: string
  content_piece_id: string
  platform_credential_id: string
  platform_adapted_copy: string
  platform_media_ids: string[]
  scheduled_publish_at: string
  published_at: string | null
  platform_post_id: string | null
  platform_response: any // JSON
  status: 'scheduled' | 'publishing' | 'published' | 'failed'
  error_message: string | null
  retry_count: number
  max_retries: number
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  user_id: string
  scheduled_post_id: string
  platform_id: string
  platform_comment_id: string
  commenter_name: string
  commenter_handle: string | null
  commenter_avatar_url: string | null
  comment_text: string
  sentiment: 'positive' | 'negative' | 'neutral' | 'question'
  sentiment_score: number
  has_reply: boolean
  is_archived: boolean
  fetched_at: string
  created_at: string
}

export interface Reply {
  id: string
  user_id: string
  comment_id: string
  suggested_reply: string
  final_reply: string | null
  is_approved: boolean
  is_autonomous: boolean
  approved_by_user: boolean
  platform_reply_id: string | null
  posted_at: string | null
  status: 'pending' | 'approved' | 'posted' | 'failed'
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface AgentLog {
  id: string
  user_id: string
  campaign_id: string | null
  content_piece_id: string | null
  agent_action: string
  log_level: 'info' | 'warning' | 'error' | 'debug'
  message: string | null
  raw_json: any // JSON
  created_at: string
}

export interface AgentState {
  id: string
  user_id: string
  current_status: 'idle' | 'scanning' | 'enriching' | 'writing' | 'creating' | 'approving' | 'publishing'
  current_action: string | null
  current_campaign_id: string | null
  stage_progress: number
  total_stages: number
  started_at: string | null
  estimated_completion_at: string | null
  total_content_generated: number
  total_posts_published: number
  comments_processed: number
  updated_at: string
}

export interface BrainStatusData {
  status: AgentState['current_status']
  action: string | null
  progress: number
  totalStages: number
  estimatedCompletion: string | null
  stats: {
    contentGenerated: number
    postsPublished: number
    commentsProcessed: number
  }
}

export interface ContentPielineUIState {
  stage: PipelineStage
  progress: number
  isLoading: boolean
  reasoning: any
}

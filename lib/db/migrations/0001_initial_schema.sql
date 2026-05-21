-- Autopost initial schema
-- Creates all core tables, RLS policies, indexes, and triggers.
-- Run before any other migration.

------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

------------------------------------------------------------------
-- profiles  (1-1 with auth.users; auto-created on signup)
------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  daily_content_limit INTEGER NOT NULL DEFAULT 10,
  monthly_api_calls_limit INTEGER NOT NULL DEFAULT 1000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = id);

------------------------------------------------------------------
-- platforms  (registry; seeded below)
------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon_url TEXT,
  api_base_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY platforms_select_all ON platforms FOR SELECT USING (true);

INSERT INTO platforms (name, display_name, api_base_url) VALUES
  ('meta',     'Meta (Facebook/Instagram)', 'https://graph.facebook.com/v18.0'),
  ('linkedin', 'LinkedIn',                  'https://api.linkedin.com/v2'),
  ('x',        'X (Twitter)',               'https://api.twitter.com/2'),
  ('tiktok',   'TikTok',                    'https://open.tiktokapis.com/v2')
ON CONFLICT (name) DO NOTHING;

------------------------------------------------------------------
-- platform_credentials
------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
  account_handle TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy','warning','error')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform_id, account_handle)
);

CREATE INDEX IF NOT EXISTS idx_platform_credentials_user ON platform_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_credentials_platform ON platform_credentials(platform_id);

DROP TRIGGER IF EXISTS platform_credentials_set_updated_at ON platform_credentials;
CREATE TRIGGER platform_credentials_set_updated_at BEFORE UPDATE ON platform_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE platform_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY platform_credentials_owner ON platform_credentials FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------------
-- campaigns
------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  niche TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  auto_publish BOOLEAN NOT NULL DEFAULT false,
  target_platforms TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

DROP TRIGGER IF EXISTS campaigns_set_updated_at ON campaigns;
CREATE TRIGGER campaigns_set_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_owner ON campaigns FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------------
-- content_pieces
------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS content_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'source_discovery'
    CHECK (stage IN ('source_discovery','topic_enrichment','copywriting','creative_generation','platform_approval')),
  stage_progress INTEGER NOT NULL DEFAULT 0,
  source_topics TEXT[] NOT NULL DEFAULT '{}',
  enriched_content TEXT,
  copywriting TEXT,
  creative_brief TEXT,
  creative_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasoning JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_insights TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','failed')),
  quality_score NUMERIC(4,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_pieces_user ON content_pieces(user_id);
CREATE INDEX IF NOT EXISTS idx_content_pieces_campaign ON content_pieces(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_pieces_status ON content_pieces(status);

DROP TRIGGER IF EXISTS content_pieces_set_updated_at ON content_pieces;
CREATE TRIGGER content_pieces_set_updated_at BEFORE UPDATE ON content_pieces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE content_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_pieces_owner ON content_pieces FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------------
-- scheduled_posts
------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_piece_id UUID NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
  platform_credential_id UUID NOT NULL REFERENCES platform_credentials(id) ON DELETE CASCADE,
  platform_adapted_copy TEXT NOT NULL,
  platform_media_ids TEXT[] NOT NULL DEFAULT '{}',
  scheduled_publish_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  platform_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','publishing','published','failed')),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_at ON scheduled_posts(status, scheduled_publish_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_content ON scheduled_posts(content_piece_id);

DROP TRIGGER IF EXISTS scheduled_posts_set_updated_at ON scheduled_posts;
CREATE TRIGGER scheduled_posts_set_updated_at BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY scheduled_posts_owner ON scheduled_posts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------------
-- comments
------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_post_id UUID REFERENCES scheduled_posts(id) ON DELETE SET NULL,
  platform_id UUID NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
  platform_comment_id TEXT NOT NULL,
  commenter_name TEXT NOT NULL,
  commenter_handle TEXT,
  commenter_avatar_url TEXT,
  comment_text TEXT NOT NULL,
  sentiment TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('positive','negative','neutral','question')),
  sentiment_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  has_reply BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform_id, platform_comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(scheduled_post_id);
CREATE INDEX IF NOT EXISTS idx_comments_sentiment ON comments(sentiment);
CREATE INDEX IF NOT EXISTS idx_comments_has_reply ON comments(has_reply);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_owner ON comments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------------
-- replies
------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  suggested_reply TEXT NOT NULL,
  final_reply TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_autonomous BOOLEAN NOT NULL DEFAULT false,
  approved_by_user BOOLEAN NOT NULL DEFAULT false,
  platform_reply_id TEXT,
  posted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','posted','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_replies_user ON replies(user_id);
CREATE INDEX IF NOT EXISTS idx_replies_comment ON replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_replies_status ON replies(status);

DROP TRIGGER IF EXISTS replies_set_updated_at ON replies;
CREATE TRIGGER replies_set_updated_at BEFORE UPDATE ON replies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY replies_owner ON replies FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------------
-- agent_logs
------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  content_piece_id UUID REFERENCES content_pieces(id) ON DELETE SET NULL,
  agent_action TEXT NOT NULL,
  log_level TEXT NOT NULL DEFAULT 'info' CHECK (log_level IN ('info','warning','error','debug')),
  message TEXT,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_user_time ON agent_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_action ON agent_logs(agent_action);

ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_logs_owner_select ON agent_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY agent_logs_owner_insert ON agent_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------------
-- agent_state  (1 row per user; latest snapshot)
------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agent_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (current_status IN ('idle','scanning','enriching','writing','creating','approving','publishing')),
  current_action TEXT,
  current_campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  stage_progress INTEGER NOT NULL DEFAULT 0,
  total_stages INTEGER NOT NULL DEFAULT 5,
  started_at TIMESTAMPTZ,
  estimated_completion_at TIMESTAMPTZ,
  total_content_generated INTEGER NOT NULL DEFAULT 0,
  total_posts_published INTEGER NOT NULL DEFAULT 0,
  comments_processed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS agent_state_set_updated_at ON agent_state;
CREATE TRIGGER agent_state_set_updated_at BEFORE UPDATE ON agent_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_state_owner ON agent_state FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------------
-- autonomy_config  (1 row per user)
------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS autonomy_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  auto_reply_positive BOOLEAN NOT NULL DEFAULT true,
  auto_reply_questions BOOLEAN NOT NULL DEFAULT false,
  auto_reply_negative BOOLEAN NOT NULL DEFAULT false,
  max_replies_per_hour INTEGER NOT NULL DEFAULT 10,
  max_replies_per_day INTEGER NOT NULL DEFAULT 100,
  forbidden_keywords TEXT[] NOT NULL DEFAULT '{}',
  whitelist_users TEXT[] NOT NULL DEFAULT '{}',
  blacklist_users TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS autonomy_config_set_updated_at ON autonomy_config;
CREATE TRIGGER autonomy_config_set_updated_at BEFORE UPDATE ON autonomy_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE autonomy_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY autonomy_config_owner ON autonomy_config FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

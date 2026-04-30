-- Create published_posts table to track posts published to platforms
CREATE TABLE IF NOT EXISTS published_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_piece_id UUID NOT NULL REFERENCES content_pieces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  post_id TEXT NOT NULL,
  post_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'published',
  engagement_score FLOAT,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  last_synced TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_published_posts_user_id ON published_posts(user_id);
CREATE INDEX idx_published_posts_content_piece_id ON published_posts(content_piece_id);
CREATE INDEX idx_published_posts_platform ON published_posts(platform);
CREATE INDEX idx_published_posts_published_at ON published_posts(published_at);

-- Enable RLS
ALTER TABLE published_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own published posts"
  ON published_posts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own published posts"
  ON published_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own published posts"
  ON published_posts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own published posts"
  ON published_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create platform_analytics table for engagement tracking
CREATE TABLE IF NOT EXISTS platform_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  published_post_id UUID NOT NULL REFERENCES published_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(published_post_id, date)
);

-- Create indexes
CREATE INDEX idx_platform_analytics_user_id ON platform_analytics(user_id);
CREATE INDEX idx_platform_analytics_published_post_id ON platform_analytics(published_post_id);
CREATE INDEX idx_platform_analytics_date ON platform_analytics(date);

-- Enable RLS
ALTER TABLE platform_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own analytics"
  ON platform_analytics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
  ON platform_analytics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics"
  ON platform_analytics
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

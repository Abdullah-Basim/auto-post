# Autopost System - Comprehensive Implementation Guide

## System Overview

Autopost is an AI-powered social media management platform that combines intelligent content creation, multi-platform distribution, and autonomous engagement to streamline social media operations. The system leverages Claude AI for content generation and provides real-time monitoring through WebSocket connections.

---

## Technology Stack

### Frontend & UI
- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui with Tailwind CSS v4
- **State Management**: React hooks + Framer Motion
- **Real-Time Updates**: Server-Sent Events (SSE) via EventSource API
- **Animations**: Framer Motion for smooth transitions

### Backend & Services
- **API**: Next.js API routes
- **Database**: Supabase PostgreSQL (with Row-Level Security)
- **Authentication**: Supabase Auth
- **AI Engine**: Anthropic Claude 3.5 Sonnet
- **Real-Time Communication**: Server-Sent Events (SSE)
- **Task Queue**: Background processing via Next.js API routes

### External Integrations
- **Meta** (Facebook/Instagram): Graph API v18+
- **LinkedIn**: LinkedIn API v2
- **X (Twitter)**: API v2 with OAuth 2.0
- **TikTok**: TikTok Open Platform API

---

## Core Architecture

### 1. Database Schema (10 Tables)

#### Authentication & User Management
- **profiles**: User profiles linked to Supabase Auth
- **agent_state**: Real-time agent status tracking for Brain Status widget

#### Content Management
- **campaigns**: User-created content campaigns organized by niche
- **content_pieces**: Generated content with 5-stage pipeline tracking
- **scheduled_posts**: Posts scheduled for publishing to platforms
- **platforms**: Registry of supported social platforms
- **platform_credentials**: Encrypted API credentials with health status

#### Community Engagement
- **comments**: Incoming comments from all platforms with sentiment analysis
- **replies**: AI-generated and user-approved replies to comments

#### Monitoring & Logging
- **agent_logs**: Detailed execution logs from the Claude AI agent

### 2. 5-Stage Content Pipeline

The system automates content creation through a sophisticated pipeline:

```
1. Source Discovery → Identify trending topics in user's niche
2. Topic Enrichment → Research and expand topics with insights
3. Copywriting → Generate compelling, platform-ready copy
4. Creative Generation → Create visual asset briefs and specs
5. Platform Approval → Final review before publishing
```

Each stage:
- Updates agent state for real-time monitoring
- Logs all decisions and reasoning
- Can be inspected by users for transparency
- Maintains quality scores

### 3. Real-Time Components

#### Brain Status Widget
- **Purpose**: Shows current AI agent activity
- **Updates**: Via SSE when agent state changes
- **Display**: Status, action, progress, statistics
- **Refresh Rate**: Real-time on agent actions

#### Agentic Log Terminal
- **Purpose**: Developer-focused activity log
- **Display**: Raw JSON logs from all agent operations
- **Tail Behavior**: Last 100 logs maintained in state
- **Refresh**: Real-time event updates

#### Comment Stream
- **Purpose**: Monitor incoming social comments
- **Auto-Sync**: Background task fetches new comments hourly
- **Sentiment**: AI analysis of positive/negative/neutral/question
- **Real-Time**: SSE events for new comments

### 4. Multi-Platform Management

#### Platform Tiles
Each connected platform shows:
- Connection health status
- Last metrics from published content
- Account information
- Quick disconnect option

#### Content Adaptation
- Platform-specific copy formatting
- Optimal media dimensions per platform
- Character limit compliance
- Hashtag strategies

#### Publishing System
- Scheduled publishing with retries
- Automatic retry on failure (max 3 attempts)
- Webhook integration for real-time updates
- Post analytics tracking

### 5. Ghost Reply Engine

#### Comment Clustering
- Automatically groups comments by sentiment
- Filters by platform and thread
- Shows commenter information

#### AI Reply Generation
- Context-aware responses using Claude
- Brand voice consistency
- Platform-specific tone adjustment
- One-click approve/reject

#### Autonomous Mode
- Optional fully-automated replies
- User-configurable sentiment thresholds
- Whitelist/blacklist management
- Audit trail of autonomous actions

---

## API Endpoints

### Campaigns Management
```
GET  /api/campaigns              - List user's campaigns
POST /api/campaigns              - Create new campaign
```

### Content Generation
```
POST /api/agent/generate-content - Start 5-stage pipeline
GET  /api/agent/state            - Get current agent state
```

### Platform Credentials
```
POST /api/platforms/credentials  - Store platform API keys
GET  /api/platforms/credentials  - List connected platforms
POST /api/platforms/publish      - Publish to single/multiple platforms
```

### Comments & Replies
```
GET  /api/comments               - Fetch comments (paginated)
POST /api/comments/sync          - Manual sync from platforms
POST /api/agent/generate-reply   - Generate AI response
POST /api/replies/[id]           - Update reply status
```

### Autonomous Engagement
```
GET  /api/autonomy/config        - Get autonomous mode settings
POST /api/autonomy/config        - Update settings
POST /api/autonomy/process       - Process pending autonomous replies
```

### Real-Time Events
```
GET  /api/realtime/events        - SSE endpoint for real-time updates
```

---

## Component Architecture

### Dashboard Layout
```
Root (Dashboard)
├── Sidebar (Navigation & Settings)
├── Header (Title & Status)
└── MainContent
    ├── OverviewTab
    │   ├── BrainStatus (Real-time widget)
    │   ├── QuickStart (Niche input)
    │   ├── ContentPipeline (5-stage visualization)
    │   ├── MultiPlatformManager (Platform tiles)
    │   └── GhostReplyEngine (Comment management)
    ├── CampaignsTab
    ├── PlatformsTab
    ├── EngagementTab
    └── LogsTab (AgenticLogTerminal)
```

### Key Components

#### BrainStatus
- Displays: Current status, action, progress bar, statistics
- Updates: Real-time SSE from agent_state table
- Props: agentState, isConnected

#### QuickStart
- Input: Niche field
- Trigger: Creates campaign + starts generation pipeline
- Feedback: Loading state, success/error messages

#### ContentPipeline
- Shows: 5 pipeline stages with progress
- Interactive: "View Reasoning" button for Claude's decisions
- Compact/Full view modes

#### MultiPlatformManager
- Platform tiles: Status, metrics, health check
- Preview toggle: Mobile vs Desktop layout
- Schedule management: Batch publish to multiple platforms

#### GhostReplyEngine
- Comment list: Grouped by sentiment
- AI suggestions: One-click approve
- Autonomous toggle: Enable/disable auto-replies

#### AgenticLogTerminal
- Live logs: Streamed from agent_logs table
- Filtering: By action type, level
- Export: Download logs as JSON

---

## Authentication & Security

### User Management
- **Sign-up/Login**: Email + password via Supabase Auth
- **Session**: HTTP-only cookies managed by Supabase
- **Authorization**: Row-Level Security (RLS) on all tables
- **Profile Auto-Creation**: Trigger on user signup

### Credential Storage
- **Encryption**: API keys encrypted at rest (future implementation)
- **Access Control**: Only users can access their own credentials
- **Rotation**: Support for token refresh and rotation
- **Validation**: Health checks on credential validity

### API Security
- **Authentication**: User ID from Supabase session
- **Authorization**: RLS policies enforce user isolation
- **Rate Limiting**: Implement via Upstash Redis (recommended)
- **Input Validation**: Zod schemas for all request bodies

---

## Deployment & Scaling

### Current Setup
- **Hosting**: Vercel (recommended for Next.js)
- **Database**: Supabase Cloud
- **AI API**: Anthropic (requires API key in .env)
- **Storage**: Supabase Storage (for media files)

### Environment Variables
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Platform APIs (add as needed)
META_APP_ID=
META_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
X_API_KEY=
X_API_SECRET=
```

### Scaling Considerations
1. **Real-Time**: Switch to WebSocket (Socket.IO) for <100ms latency
2. **Task Queue**: Implement Upstash Redis for background jobs
3. **Caching**: Add Redis cache layer for frequently accessed data
4. **Analytics**: Integrate PostHog or Mixpanel for usage tracking
5. **Storage**: Scale media uploads with Vercel Blob or S3

---

## Development Workflow

### Starting the Dev Server
```bash
pnpm install
pnpm dev
# Runs on http://localhost:3000
```

### Database Migrations
```bash
# Create new tables/columns
# Edit migration files in supabase/migrations/
# Apply with: supabase db push
```

### Adding New Endpoints
1. Create route file: `app/api/[feature]/route.ts`
2. Get user from Supabase Auth
3. Query database using lib/db/queries.ts functions
4. Return JSON response

### Testing Locally
- Use Postman/Insomnia for API testing
- Manual testing via browser DevTools
- Check browser console for debug logs: `[v0] ...`

---

## Implementation Phases

### ✅ Phase 1: Foundation (Complete)
- Database schema with 10 tables and RLS
- Supabase Auth integration
- Type definitions and database queries

### 🔄 Phase 2: Dashboard & Agent State (In Progress)
- Dashboard layout with tabbed interface
- Real-time agent state updates via SSE
- Brain Status widget implementation
- Agentic Log Terminal

### 📋 Phase 3: Claude AI Integration (Next)
- 5-stage content pipeline implementation
- Reasoning/transparency display
- Streaming responses for real-time feedback

### 📱 Phase 4: Platform Integrations (Planned)
- Meta Graph API (Facebook/Instagram)
- LinkedIn API integration
- X API integration
- TikTok API integration

### 🔔 Phase 5: Real-Time WebSocket & Comments (Planned)
- WebSocket setup (Socket.IO)
- Comment syncing from platforms
- Real-time comment notifications

### 🤖 Phase 6: Ghost Reply Engine (Planned)
- Comment sentiment analysis
- AI reply generation
- Autonomous mode implementation
- Reply scheduling and posting

### ✨ Phase 7: UI Polish & Deployment (Final)
- Design refinements
- Performance optimization
- Testing & QA
- Production deployment

---

## Key Features & User Flows

### Creating Content
1. User enters niche in Quick Start
2. System creates campaign
3. Claude runs 5-stage pipeline
4. User sees reasoning at each stage
5. Content marked ready for publishing
6. User adapts for specific platforms if needed
7. Schedule publication or publish immediately

### Managing Platforms
1. User connects social account via OAuth
2. Credentials stored encrypted
3. Platform tile shows connection health
4. User can preview how content looks on each platform
5. Toggle which platforms to publish to

### Engaging with Comments
1. Comments auto-sync hourly from platforms
2. Displayed grouped by sentiment
3. AI generates suggested replies
4. User can approve one-click or customize
5. Optional autonomous mode for auto-replies
6. Audit trail of all engagement

### Monitoring Activity
1. Brain Status shows what agent is doing now
2. Log Terminal shows raw execution logs
3. Real-time updates via SSE
4. Statistics on content generated, posts published, comments processed

---

## Error Handling & Recovery

### Agent Failures
- Logged with full context
- State rolled back to last known good
- User notified with error message
- Automatic retry for transient errors

### Platform Publishing Failures
- Retry up to 3 times with exponential backoff
- Log platform-specific error codes
- Alert user after max retries
- Store for manual retry later

### Comment Sync Failures
- Don't fail if one platform errors
- Continue with other platforms
- Log per-platform error separately

---

## Future Enhancements

1. **Video Content**: Integrate video generation APIs
2. **Analytics Dashboard**: Track performance of published content
3. **A/B Testing**: Test different variations of copy/creative
4. **Team Collaboration**: Multi-user teams with roles
5. **Compliance**: GDPR/CCPA audit logs and data export
6. **Mobile App**: React Native version for management on-the-go
7. **Marketplace**: Monetize templates and content strategies

---

## Support & Troubleshooting

### Common Issues

**"Anthropic API key not found"**
- Add `ANTHROPIC_API_KEY` to `.env.local`
- Restart dev server

**"Unauthorized" on API calls**
- Check if user is logged in
- Verify Supabase session cookie
- Check browser DevTools for auth errors

**Comments not appearing**
- Verify platform credentials are active
- Check last_synced_at timestamp
- Run manual sync from platform management

**Real-time updates not working**
- Check browser console for SSE connection errors
- Verify `/api/realtime/events` endpoint is working
- Check browser DevTools Network tab

---

## Resources

- [Next.js 14 Documentation](https://nextjs.org)
- [Supabase Documentation](https://supabase.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Meta Graph API](https://developers.facebook.com/docs/graph-api)
- [LinkedIn API](https://docs.microsoft.com/en-us/linkedin/shared/api-fundamentals/overview)
- [X API](https://developer.twitter.com/en/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Framer Motion](https://www.framer.com/motion)

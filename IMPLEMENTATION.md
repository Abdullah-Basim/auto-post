# Autopost System Implementation Guide

## Overview

Autopost is a comprehensive AI-powered social media management platform built with modern web technologies. This document outlines the current implementation status and key architectural decisions.

## Technology Stack

### Frontend
- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS with custom design tokens
- **UI Components**: shadcn/ui with custom modifications
- **Real-Time**: Server-Sent Events (SSE) via `/api/ws`
- **State Management**: React hooks + Supabase client

### Backend
- **Runtime**: Node.js (Next.js API Routes)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth with RLS
- **AI/ML**: Anthropic Claude 3.5 Sonnet
- **WebSocket**: Socket.IO ready (currently using SSE)

### Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage (for media assets)
- **Secrets**: Environment variables via Vercel

## Project Structure

```
/vercel/share/v0-project/
├── app/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── page.tsx             # Dashboard home
│   │   └── layout.tsx           # Dashboard layout
│   ├── auth/                    # Authentication routes
│   │   ├── callback/            # OAuth callback
│   │   ├── login/               # Login page
│   │   ├── sign-up/             # Sign up page
│   │   └── error/               # Auth errors
│   ├── api/
│   │   ├── agent/               # AI agent endpoints
│   │   │   ├── generate-content/    # Content pipeline trigger
│   │   │   └── state/               # Agent status
│   │   ├── campaigns/           # Campaign management
│   │   ├── platforms/           # Platform integrations
│   │   │   └── credentials/     # Platform OAuth/API keys
│   │   └── ws/                  # WebSocket/SSE endpoint
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Redirect to dashboard
│   └── globals.css             # Global styles + theme
├── components/
│   ├── dashboard.tsx           # Main dashboard container
│   ├── brain-status.tsx        # Real-time agent status widget
│   ├── quick-start.tsx         # Content generation quick start
│   ├── content-pipeline.tsx    # 5-stage pipeline visualizer
│   ├── multi-platform-manager.tsx # Platform management
│   ├── ghost-reply-engine.tsx  # Comment response system
│   ├── agent-log-terminal.tsx  # Execution log viewer
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client
│   │   └── proxy.ts            # Session proxy
│   ├── services/
│   │   └── claude-agent.ts     # Claude API integration
│   └── db/
│       └── queries.ts          # Database query functions
├── hooks/
│   └── use-agent-state.ts      # Real-time agent state hook
├── types/
│   └── index.ts                # TypeScript type definitions
├── middleware.ts               # Next.js middleware (auth)
├── tsconfig.json              # TypeScript config
└── package.json               # Dependencies
```

## Database Schema

### Core Tables

1. **profiles** - User profile information
2. **platforms** - Registry of supported social platforms
3. **platform_credentials** - Encrypted API credentials per platform
4. **campaigns** - Content campaigns and initiatives
5. **content_pieces** - Generated content with 5-stage pipeline tracking
6. **scheduled_posts** - Posts scheduled for publishing
7. **comments** - Incoming comments from all platforms
8. **replies** - AI-generated replies to comments
9. **agent_logs** - Detailed execution logs from AI agent
10. **agent_state** - Current state for real-time monitoring

All tables include Row-Level Security (RLS) policies ensuring users can only access their own data.

## Key Features

### 1. Brain Status Widget
- Real-time agent status monitoring
- Progress tracking through 5-stage pipeline
- Statistics on generated content and published posts
- Color-coded status indicators

**File**: `components/brain-status.tsx`

### 2. Quick Start
- One-input content generation trigger
- Automatic campaign creation
- Full pipeline orchestration

**File**: `components/quick-start.tsx`

### 3. Content Pipeline
- 5-stage visualization:
  1. Source Discovery (trending topic identification)
  2. Topic Enrichment (research and insights)
  3. Copywriting (engaging copy generation)
  4. Creative Generation (visual brief creation)
  5. Platform Approval (final review)

**File**: `components/content-pipeline.tsx`

### 4. Multi-Platform Manager
- Support for Meta (Facebook/Instagram), LinkedIn, X (Twitter), TikTok
- Health status indicators for each platform
- Platform-specific content adaptation

**File**: `components/multi-platform-manager.tsx`

### 5. Ghost Reply Engine
- Automatic comment sentiment clustering
- AI-generated reply suggestions
- Autonomous reply mode toggle
- Approval workflow for manual control

**File**: `components/ghost-reply-engine.tsx`

### 6. Agent Log Terminal
- Real-time execution logs
- JSON payload inspection
- Development and debugging support

**File**: `components/agent-log-terminal.tsx`

## AI Integration

### Claude API Setup
The system uses Anthropic Claude 3.5 Sonnet for all content generation tasks.

**Environment Variable Required**:
```
ANTHROPIC_API_KEY=your_anthropic_api_key
```

**Agent Service**: `lib/services/claude-agent.ts`

Key functions:
- `generateContentPipeline()` - Full 5-stage content creation
- `generateReplyToComment()` - AI-powered comment responses
- `analyzeSentiment()` - Comment sentiment analysis

## API Endpoints

### Authentication
- `GET /auth/callback` - OAuth callback handler
- `POST /auth/login` - Email/password login
- `POST /auth/sign-up` - User registration

### Agent
- `POST /api/agent/generate-content` - Trigger content pipeline
- `GET /api/agent/state` - Get current agent status
- `GET /api/ws?mode=status` - WebSocket/SSE stream

### Campaigns
- `GET /api/campaigns` - List user campaigns
- `POST /api/campaigns` - Create new campaign

### Platforms
- `GET /api/platforms/credentials` - Get connected platforms
- `POST /api/platforms/credentials` - Add platform credential

## Real-Time Updates

The system uses Server-Sent Events (SSE) for real-time updates:

```typescript
// Frontend
const eventSource = new EventSource('/api/ws?mode=status')
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // Handle update
}

// Backend
const stream = new ReadableStream({
  async start(controller) {
    // Stream updates every 3 seconds
    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(message)}\n\n`))
  }
})
```

## Security

### Authentication
- Supabase Auth with email/password and OAuth support
- Row-Level Security (RLS) on all tables
- User session management with HTTP-only cookies

### Credential Storage
- Platform API credentials stored in `platform_credentials` table
- Ready for encryption with pgcrypto (not yet implemented)
- Separate tokens for each platform

### Best Practices
- API keys/secrets in environment variables only
- No credentials committed to repository
- CORS restrictions on backend endpoints

## Deployment

### Environment Variables Required
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: OAuth Redirect (for Vercel preview URLs)
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/auth/callback
```

### Deployment Steps
1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel project settings
4. Deploy

## Current Implementation Status

### Completed (Phase 1 & 2)
- ✅ Database schema with RLS
- ✅ Authentication setup (Supabase Auth)
- ✅ User profile management
- ✅ Dashboard layout
- ✅ Brain Status widget
- ✅ Quick Start component
- ✅ UI component structure
- ✅ Type definitions
- ✅ Theme and styling (dark mode)
- ✅ Claude API integration setup
- ✅ Agent service with 5-stage pipeline
- ✅ Real-time state hook
- ✅ API routes foundation

### In Progress (Phase 3)
- 🔄 Full Claude integration testing
- 🔄 Content generation optimization
- 🔄 Sentiment analysis implementation

### TODO (Phases 4-7)
- ⏳ Platform OAuth integrations (Meta, LinkedIn, X, TikTok)
- ⏳ Webhook handlers for incoming comments
- ⏳ Post scheduling and publishing
- ⏳ Comment sync and reply automation
- ⏳ Advanced sentiment analysis
- ⏳ Autonomous reply mode
- ⏳ Background job queue (Upstash Redis)
- ⏳ Enhanced WebSocket implementation
- ⏳ Performance optimization
- ⏳ Comprehensive testing
- ⏳ Documentation

## Development Guide

### Local Development
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run development server
pnpm dev

# Open browser to http://localhost:3000
```

### Database Migrations
Database changes are managed through Supabase migrations. To apply new migrations:

```bash
# Execute SQL directly via Supabase MCP tool
# See IMPLEMENTATION.md for schema updates
```

### Component Development
Components are located in `/components`. They use:
- shadcn/ui for base components
- Tailwind CSS for styling
- Custom design tokens from globals.css

### Adding New Features
1. Create database schema if needed (use Supabase MCP)
2. Create API route in `/app/api`
3. Create query functions in `/lib/db/queries.ts`
4. Create UI components in `/components`
5. Connect in dashboard or appropriate page

## Troubleshooting

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `pnpm install`
- Check environment variables are set

### Database Issues
- Verify Supabase connection in `.env.local`
- Check RLS policies are not blocking operations
- Review auth.users table for user records

### API Errors
- Check console logs for detailed error messages
- Verify user is authenticated (check Supabase Auth)
- Confirm request body matches expected schema

## Next Steps

1. **Phase 3**: Complete Claude API integration and test content generation
2. **Phase 4**: Implement Meta Graph API integration for Facebook/Instagram
3. **Phase 5**: Add LinkedIn API integration
4. **Phase 6**: Add X API integration
5. **Phase 7**: Add TikTok API integration and comment syncing
6. **Phase 8**: Implement background jobs with Upstash Redis
7. **Phase 9**: Full testing and optimization
8. **Phase 10**: Deployment and monitoring

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

## Support

For issues or questions, refer to:
1. This IMPLEMENTATION.md file
2. Inline code comments
3. Component JSDoc comments
4. Official documentation links above

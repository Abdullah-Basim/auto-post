# Autopost Quick Start Guide

Get up and running with Autopost in 5 minutes.

## 1. Prerequisites (5 min)

```bash
# Check Node version
node --version  # Should be 18+

# Install pnpm if you don't have it
npm install -g pnpm

# Verify installation
pnpm --version
```

## 2. Clone & Install (3 min)

```bash
# Clone the repository
git clone https://github.com/yourusername/autopost.git
cd autopost

# Install dependencies
pnpm install

# Should complete in ~2 minutes
```

## 3. Environment Setup (5 min)

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Claude API (required for AI features)
ANTHROPIC_API_KEY=your-api-key

# Optional - Platform APIs
# META_APP_ID=your-meta-app-id
# LINKEDIN_CLIENT_ID=your-client-id
# X_API_KEY=your-x-api-key
```

### Get API Keys

1. **Supabase:**
   - Go to https://supabase.com
   - Create a free project
   - Copy keys from project settings

2. **Anthropic:**
   - Go to https://console.anthropic.com
   - Create API key
   - Add to environment

3. **Platform APIs (optional):**
   - Meta: https://developers.facebook.com
   - LinkedIn: https://developer.linkedin.com
   - X: https://developer.twitter.com

## 4. Database Setup (2 min)

### Option A: Supabase Dashboard (easiest)

1. Go to Supabase project SQL Editor
2. Copy contents of `lib/db/migrations/create_tables.sql`
3. Paste and execute

### Option B: Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Run migrations
supabase db push
```

## 5. Start Development (1 min)

```bash
# Start dev server
pnpm dev

# Open http://localhost:3000
# Sign up with test email
# Access dashboard
```

## What You Get

### Dashboard with:
- Brain Status (AI activity monitor)
- Content Pipeline (5-stage generation)
- Multi-Platform Publisher
- Comments Manager
- Autonomy Settings
- Publishing Analytics
- Agent Logs

### Features:
- AI content generation
- Multi-platform publishing
- Comment management
- Autonomous replies
- Real-time updates

## First Steps

### 1. Sign Up
- Go to http://localhost:3000/auth/sign-up
- Enter email and password
- Confirm email (check inbox or spam)

### 2. Create Campaign
- Click "New Campaign" or go to Campaigns tab
- Enter campaign name and niche
- Select target platforms
- Click Create

### 3. Generate Content
- Go to Content Pipeline tab
- Click "Generate Content"
- Watch 5 stages complete in 30-60 seconds
- View generated content and reasoning

### 4. Add Platform Credentials (Optional)
- Go to Platforms tab
- Click "Add Credential"
- Select platform
- Authenticate with your account
- Permission scope will be shown

### 5. Publish Content
- Select content piece
- Choose platforms
- Pick publish time (or now)
- Click Publish
- Track status in Publishing tab

## Common Issues

### "ANTHROPIC_API_KEY not set"
- Add key to `.env.local`
- Restart dev server (`pnpm dev`)

### Database connection error
- Verify Supabase URL and keys in `.env.local`
- Check if migrations were run
- Verify table creation in Supabase dashboard

### Port 3000 already in use
```bash
# Use different port
pnpm dev -- -p 3001
```

### WebSocket connection fails
- Clear browser cache
- Check browser console for errors
- Verify localhost development mode

## File Structure Overview

```
autopost/
├── app/              # Next.js routes
│   ├── page.tsx     # Home page
│   ├── api/         # API endpoints
│   └── auth/        # Auth pages
├── components/      # React components
├── lib/
│   ├── db/          # Database queries
│   ├── services/    # Business logic
│   └── supabase/    # Supabase config
├── hooks/           # React hooks
├── types/           # TypeScript types
└── public/          # Static files
```

## Key Components

### Dashboard (`components/dashboard.tsx`)
Main app layout with tabs for different features.

### Content Pipeline (`components/content-pipeline.tsx`)
Displays the 5-stage AI generation process.

### Brain Status (`components/brain-status.tsx`)
Real-time AI activity monitor with progress bar.

### Comments Manager (`components/comments-manager.tsx`)
Comment inbox with sentiment analysis and replies.

### Autonomy Config (`components/autonomy-config.tsx`)
Settings for autonomous reply behavior.

## API Examples

### Generate Content
```bash
curl -X POST http://localhost:3000/api/agent/generate-content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"campaign-123"}'
```

### Get Campaign List
```bash
curl -X GET http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer $TOKEN"
```

### Publish Content
```bash
curl -X POST http://localhost:3000/api/platforms/publish-multi \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentPieceId":"content-123",
    "platforms":["x","linkedin"],
    "scheduledFor":"2025-01-15T10:00:00Z"
  }'
```

## Next Steps

### Learn More
- Read [README_FINAL.md](./README_FINAL.md) for full documentation
- Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for production setup
- See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing procedures

### Customize
1. Update brand colors in `app/globals.css`
2. Modify AI prompts in `lib/services/claude-agent.ts`
3. Add platform adapters in `lib/services/platforms/`
4. Create custom components in `components/`

### Deploy
1. Push to GitHub: `git push`
2. Go to Vercel: https://vercel.com
3. Import project and set environment variables
4. Click Deploy

## Useful Commands

```bash
# Development
pnpm dev                 # Start dev server
pnpm build              # Build for production
pnpm start              # Run production build

# Testing
pnpm test               # Run tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report

# Code Quality
pnpm lint              # Run ESLint
pnpm format            # Run Prettier
pnpm type-check        # Check TypeScript

# Database
supabase db push       # Apply migrations
supabase db pull       # Fetch remote schema
```

## Support

- GitHub Issues: https://github.com/yourusername/autopost/issues
- Documentation: See docs/ folder
- Supabase Help: https://supabase.com/support
- Anthropic Docs: https://docs.anthropic.com

## Tips

- **Slow generation?** Check Claude API quota
- **Comments not syncing?** Add platform credentials
- **Real-time not working?** Clear cache, hard refresh
- **Database errors?** Check Supabase dashboard for RLS issues

## Success!

You now have a fully functional AI-powered social media management platform. Start by:

1. Creating a campaign
2. Generating some content
3. Exploring the comments manager
4. Configuring autonomous replies
5. Publishing to platforms

Happy automating! 🚀

---

For detailed setup and deployment, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

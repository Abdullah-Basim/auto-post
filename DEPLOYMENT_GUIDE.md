# Autopost Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables

Set these variables in your Vercel project settings:

**Required:**
```
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

**Optional (for full platform integration):**
```
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
X_API_KEY=your-x-api-key
X_API_SECRET=your-x-api-secret
```

### 2. Database Setup

1. Create Supabase project at https://supabase.com
2. Run the migration script in `lib/db/migrations/create_published_posts.sql`
3. Verify all tables are created with proper RLS policies
4. Test authentication with a test user account

### 3. OAuth Redirect URLs

Configure OAuth for each platform you're integrating:

**Meta (Facebook/Instagram):**
- Valid OAuth Redirect URIs: `https://your-domain.com/auth/callback/meta`

**LinkedIn:**
- Authorized redirect URLs: `https://your-domain.com/auth/callback/linkedin`

**X (Twitter):**
- Callback URLs: `https://your-domain.com/auth/callback/x`

## Deployment Steps

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Deploy Autopost v1.0"
git push origin main
```

### Step 2: Deploy to Vercel

Option A: Via Vercel Dashboard
1. Go to https://vercel.com
2. Click "Import Project"
3. Select your GitHub repository
4. Configure environment variables
5. Click "Deploy"

Option B: Via Vercel CLI
```bash
npm install -g vercel
vercel --prod
```

### Step 3: Run Database Migrations

```bash
# Via Supabase dashboard
1. Go to SQL Editor
2. Run migration scripts from lib/db/migrations/

# Or use Supabase CLI
supabase db push
```

### Step 4: Test Authentication

1. Visit https://your-domain.com
2. Sign up with a test email
3. Verify email confirmation works
4. Test login/logout flows

## Health Checks

### API Endpoints
```bash
# Check API health
curl https://your-domain.com/api/agent/state
curl https://your-domain.com/api/campaigns
curl https://your-domain.com/api/websocket/init

# All should return 401 without auth (expected)
```

### Database Connectivity
```bash
# Via Supabase Dashboard
1. Query Editor
2. SELECT * FROM profiles LIMIT 1;
3. Should return empty or test data
```

### Authentication
```bash
# Test sign up
POST /auth/callback
Body: { code: "test_code" }

# Should redirect to dashboard on success
```

## Monitoring & Maintenance

### Daily Tasks
- Check agent logs for errors
- Monitor platform credential health
- Review autonomous reply accuracy

### Weekly Tasks
- Backup Supabase database
- Review published content metrics
- Update platform credentials if expired

### Monthly Tasks
- Review cost usage
- Update documentation
- Check for dependency updates

## Troubleshooting

### Issue: Claude API not responding

**Solution:**
1. Verify ANTHROPIC_API_KEY is set correctly
2. Check Claude API quota and billing
3. Review error logs in agent terminal
4. Fallback to cached responses if available

### Issue: Platform credentials invalid

**Solution:**
1. Check credential expiration dates
2. Re-authenticate platform accounts
3. Verify API permissions granted
4. Test credential with platform API directly

### Issue: WebSocket connection fails

**Solution:**
1. Check browser console for connection errors
2. Verify NEXT_PUBLIC_APP_URL is correct
3. Test WebSocket connection: `nc -zv your-domain.com 443`
4. Check CORS configuration

### Issue: Database queries slow

**Solution:**
1. Check query performance in Supabase
2. Verify indexes are created
3. Archive old comments/logs
4. Consider caching frequently accessed data

## Performance Optimization

### Caching Strategy
- Content pieces: Cache for 1 hour
- Comments: Cache for 5 minutes
- Agent state: Real-time via WebSocket
- Platform credentials: Cache for 24 hours

### Database Optimization
- Add indexes on frequently queried columns
- Archive comments older than 90 days
- Partition agent_logs by date
- Clean up draft content pieces regularly

### Frontend Optimization
- Lazy load comments and replies
- Paginate content lists
- Use service workers for offline support
- Implement request debouncing

## Security Hardening

### Before Production
1. Enable Supabase RLS on all tables
2. Set up rate limiting on API endpoints
3. Configure CORS properly
4. Enable HTTPS everywhere
5. Set secure cookies with HttpOnly flag

### Ongoing
1. Rotate API keys quarterly
2. Monitor suspicious activity
3. Keep dependencies updated
4. Regular security audits
5. Implement OWASP top 10 protections

## Rollback Plan

If deployment has critical issues:

```bash
# Rollback to previous version
vercel --prod --scope your-scope rollback

# Or redeploy from git
git revert [commit-hash]
git push origin main
# Re-deploy via Vercel
```

## Support & Resources

- GitHub Issues: https://github.com/yourusername/autopost/issues
- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
- Anthropic Docs: https://docs.anthropic.com
- Platform Documentation:
  - Meta: https://developers.facebook.com
  - LinkedIn: https://developer.linkedin.com
  - X: https://developer.twitter.com

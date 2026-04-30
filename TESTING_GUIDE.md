# Autopost Testing Guide

## Test Environment Setup

### Prerequisites
- Node.js 18+
- pnpm package manager
- Supabase local development server (optional)

### Installation
```bash
cd autopost
pnpm install
pnpm dev
```

## Unit Tests

### Database Queries
```bash
pnpm test lib/db/queries.test.ts

# Test cases:
# - createCampaign: Creates campaign and verifies RLS
# - getCampaigns: Retrieves only user's campaigns
# - updateAgentState: Updates state atomically
# - createContentPiece: Creates with valid stage
```

### Claude Agent Service
```bash
pnpm test lib/services/claude-agent.test.ts

# Test cases:
# - generateContent: Full 5-stage pipeline
# - contentReasoningStructure: Verifies reasoning format
# - errorHandling: Graceful failures
# - tokenLimitRespect: Stays within max tokens
```

### Autonomous Replies
```bash
pnpm test lib/services/autonomous-replies.test.ts

# Test cases:
# - generateCommentReply: Creates appropriate responses
# - sentimentFiltering: Respects configuration
# - dailyLimitEnforcement: Limits autonomous replies
# - configurationUpdate: Persists settings
```

## Integration Tests

### Authentication Flow
```bash
# Test Suite: Authentication
pnpm test tests/auth.integration.ts

Steps:
1. Sign up new user
2. Verify email confirmation required
3. Login with valid credentials
4. Verify session created
5. Logout and verify session cleared
6. Test password recovery flow
```

### Content Generation Pipeline
```bash
# Test Suite: Pipeline
pnpm test tests/pipeline.integration.ts

Steps:
1. Create campaign
2. Trigger content generation
3. Verify all 5 stages complete
4. Verify reasoning captured
5. Verify quality score assigned
6. Verify content stored correctly
```

### Platform Publishing
```bash
# Test Suite: Publishing
pnpm test tests/publishing.integration.ts

Steps:
1. Create scheduled post
2. Adapt content for each platform
3. Simulate publishing
4. Verify platform response logged
5. Verify status updated
6. Test retry logic on failure
```

### Comment Management
```bash
# Test Suite: Comments
pnpm test tests/comments.integration.ts

Steps:
1. Fetch comments from database
2. Verify sentiment classification
3. Test reply generation
4. Test autonomous reply posting
5. Verify real-time updates via WebSocket
6. Test comment archival
```

## API Testing

### Testing Tool: Postman/curl

**Authentication Endpoints**
```bash
# Sign up
curl -X POST http://localhost:3000/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

**Campaign Endpoints**
```bash
# Create campaign
curl -X POST http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Q1 Content","niche":"AI News","targetPlatforms":["twitter","linkedin"]}'

# List campaigns
curl -X GET http://localhost:3000/api/campaigns \
  -H "Authorization: Bearer $TOKEN"

# Get campaign
curl -X GET http://localhost:3000/api/campaigns/{id} \
  -H "Authorization: Bearer $TOKEN"
```

**Content Generation Endpoints**
```bash
# Generate content
curl -X POST http://localhost:3000/api/agent/generate-content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"campaignId":"[CAMPAIGN_ID]"}'

# Stream content generation (SSE)
curl -X POST http://localhost:3000/api/agent/generate-content-stream \
  -H "Authorization: Bearer $TOKEN" \
  -N
```

**Publishing Endpoints**
```bash
# Publish to platforms
curl -X POST http://localhost:3000/api/platforms/publish-multi \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentPieceId":"[CONTENT_ID]",
    "platforms":["twitter","linkedin"],
    "scheduledFor":"2025-01-15T10:00:00Z"
  }'
```

## WebSocket Testing

### Test Real-Time Updates

**Using Node WebSocket Client:**
```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3000', {
  headers: {
    Authorization: 'Bearer ' + token,
    userId: userId
  }
});

ws.on('open', () => {
  console.log('Connected');
  
  // Trigger agent start
  ws.send(JSON.stringify({
    event: 'agent:start',
    campaignId: 'test-campaign'
  }));
});

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data));
});

ws.on('close', () => {
  console.log('Disconnected');
});
```

## UI/UX Testing

### Manual Testing Checklist

**Dashboard**
- [ ] Page loads without errors
- [ ] Brain Status widget displays correctly
- [ ] Quick Start input accepts text
- [ ] All tabs load content
- [ ] Responsive design on mobile/tablet

**Content Generation**
- [ ] Can create campaign
- [ ] Can trigger content generation
- [ ] Pipeline stages display progress
- [ ] Reasoning modal opens and displays
- [ ] Reasoning is readable and accurate

**Comments**
- [ ] Comments display with sentiment
- [ ] Comments grouped by sentiment
- [ ] Reply button works
- [ ] Reply text submits correctly
- [ ] Real-time updates appear

**Settings**
- [ ] Autonomy config saves
- [ ] Platform credentials can be added
- [ ] Settings persist across sessions
- [ ] Error messages are clear

## Performance Testing

### Load Testing
```bash
# Using k6 (install: https://k6.io)
k6 run tests/load-test.js

# Test scenarios:
# - 10 users signing up simultaneously
# - 50 users generating content
# - 100 users viewing dashboard
# - WebSocket connection stress test
```

### Database Performance
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM content_pieces 
WHERE user_id = $1 
ORDER BY created_at DESC 
LIMIT 10;

-- Verify indexes are being used
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'content_pieces';
```

## Security Testing

### Authentication Security
```bash
# Test JWT token expiration
# Test refresh token rotation
# Test CORS headers
# Test XSS prevention
# Test SQL injection prevention
```

### Data Privacy
```bash
# Verify RLS policies work
# Test user can't access other users' data
# Verify credentials are encrypted
# Test data deletion on account removal
```

## Browser Compatibility

Test in:
- Chrome 120+
- Firefox 121+
- Safari 17+
- Edge 120+

## Test Coverage Goals

- **Functions**: >90% coverage
- **API Routes**: >95% coverage
- **Database Queries**: >90% coverage
- **Components**: >80% visual regression tests

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- lib/services/claude-agent.test.ts

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test -- --watch
```

## Continuous Integration

Tests run automatically on:
- Pull requests to main branch
- Commits to main branch
- Scheduled daily at 2 AM UTC

Failing tests block deployment.

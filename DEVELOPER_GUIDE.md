# Autopost Developer Quick Reference

## Quick Start

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Key Architecture Decisions

### 1. Database First
- All business logic depends on database state
- RLS policies enforce security at database level
- Mutations through stored queries in `lib/db/queries.ts`
- Always pass `user_id` for user isolation

### 2. Real-Time via SSE (Upgrading to WebSocket)
- Server-Sent Events for agent status updates
- EventSource connections in `useRealtime` and `useAgentState` hooks
- Future: Switch to Socket.IO for <100ms latency

### 3. AI-First Content Generation
- Claude 3.5 Sonnet for all content generation
- JSON-structured prompts for reliable parsing
- Reasoning stored in content_pieces.reasoning for transparency

### 4. Component-Driven UI
- Break dashboard into focused, reusable components
- Props-based configuration for dashboard tabs
- Framer Motion for smooth state transitions

---

## Common Development Tasks

### Adding a New Dashboard Feature

1. **Create Component**
```typescript
// components/new-feature.tsx
'use client'

export function NewFeature({ userId }: { userId: string }) {
  // Implementation
}
```

2. **Add to Dashboard**
```typescript
// components/dashboard.tsx - Add to tab content
{selectedTab === 'new-tab' && <NewFeature userId={userId} />}
```

3. **Create API Endpoint**
```typescript
// app/api/new-feature/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  // Your logic here
  return NextResponse.json({ data: 'result' })
}
```

### Modifying Database Schema

1. **Create Migration** (via Supabase dashboard or CLI)
```sql
-- supabase/migrations/new_table.sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- your columns
);

ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_data" ON new_table FOR SELECT USING (auth.uid() = user_id);
```

2. **Update TypeScript Types**
```typescript
// types/index.ts
export interface NewTable {
  id: string
  user_id: string
  // ...
}
```

3. **Add Database Queries**
```typescript
// lib/db/queries.ts
export async function getNewTableData() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('new_table').select('*')
  if (error) throw error
  return data as NewTable[]
}
```

### Integrating a New Social Platform

1. **Create Platform Service**
```typescript
// lib/services/platforms/new-platform.ts
export async function postToNewPlatform(
  credential: PlatformCredential,
  content: { text: string; media?: string[] }
): Promise<{ id: string; url: string }> {
  // API implementation
  return { id: 'post_id', url: 'post_url' }
}
```

2. **Update Platform Publisher**
```typescript
// lib/services/platform-publisher.ts
import { postToNewPlatform } from './platforms/new-platform'

case 'new-platform':
  const result = await postToNewPlatform(credential, content)
  return {
    platform: 'New Platform',
    success: true,
    post_id: result.id,
    post_url: result.url,
  }
```

3. **Add to Credentials API**
```typescript
// app/api/platforms/credentials/route.ts
// Handle credential storage and validation for new platform
```

---

## Common Code Patterns

### Fetching Data with User Isolation

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data: { user }, error: userError } = await supabase.auth.getUser()

if (userError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// RLS automatically filters to user's data
const { data } = await supabase
  .from('my_table')
  .select('*')
  .eq('user_id', user.id)  // Not always necessary due to RLS, but explicit is safe
```

### Broadcasting Real-Time Updates

```typescript
// In API route after mutation
await supabase
  .from('agent_state')
  .update({ current_status: 'idle' })
  .eq('user_id', userId)

// Client automatically receives via useRealtime hook
```

### Error Handling

```typescript
try {
  const result = await riskyOperation()
  return NextResponse.json(result)
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error('[v0] Operation failed:', error)
  
  await createAgentLog({
    user_id: userId,
    agent_action: 'operation_failed',
    log_level: 'error',
    message,
  })
  
  return NextResponse.json({ error: message }, { status: 500 })
}
```

### Client-Side Data Fetching

```typescript
'use client'

import { useEffect, useState } from 'react'

export function MyComponent({ userId }: { userId: string }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/my-endpoint')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  return <div>{/* Render data */}</div>
}
```

### Using Real-Time Updates

```typescript
'use client'

import { useRealtime } from '@/hooks/use-realtime'

export function RealtimeComponent() {
  const { isConnected, error } = useRealtime((message) => {
    console.log('Received:', message)
    // Update local state based on message type
  })

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
      {error && <p>Error: {error}</p>}
    </div>
  )
}
```

---

## Debugging Tips

### 1. Check Console Logs
```typescript
console.log('[v0] Variable:', variable) // Prefixed for easy filtering
```

Check browser DevTools console for client-side logs.

### 2. Inspect Network Requests
- Open DevTools → Network tab
- Filter by API calls (`/api/*`)
- Check request/response headers and body

### 3. Check Database State
- Go to Supabase dashboard
- Browse tables directly
- Verify RLS policies are applied

### 4. Monitor Real-Time Events
- Open DevTools → Network tab
- Filter for EventSource
- Watch for new events being streamed

### 5. Check Agent Logs
- Visit dashboard "Agent Logs" tab
- Search for error level logs
- Check raw JSON for detailed context

---

## Performance Tips

1. **Database Queries**
   - Use indexes on frequently-filtered columns
   - Limit result sets with `.limit(100)`
   - Avoid N+1 queries (fetch related data together)

2. **API Calls**
   - Cache responses when possible
   - Use request deduplication
   - Cancel requests when component unmounts

3. **UI Rendering**
   - Memoize expensive components with `memo()`
   - Use `useCallback` for event handlers
   - Batch state updates

4. **Real-Time Updates**
   - Don't broadcast every keystroke
   - Debounce frequent updates
   - Compress payload size

---

## Testing

### Unit Tests (Setup)
```bash
# Install test dependencies
pnpm add -D vitest @testing-library/react @testing-library/jest-dom

# Create test file
# components/my-component.test.tsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from './my-component'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent userId="test" />)
    expect(screen.getByText('expected')).toBeInTheDocument()
  })
})
```

### Integration Tests
```typescript
// Test API endpoint behavior
// tests/api.test.ts
import { POST } from '@/app/api/endpoint/route'

describe('POST /api/endpoint', () => {
  it('creates resource', async () => {
    const request = new Request('http://localhost:3000', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
  })
})
```

---

## Deployment Preparation

### 1. Environment Variables
Create `.env.production` with all required variables (see IMPLEMENTATION_STATUS.md)

### 2. Database Migrations
```bash
# Apply all pending migrations
supabase db push
```

### 3. Test Build Locally
```bash
pnpm build
pnpm start
```

### 4. Vercel Deployment
```bash
# Push to GitHub (if connected)
git push origin main

# Deploy via Vercel CLI
vercel deploy --prod
```

### 5. Post-Deployment
- Monitor error logs in Sentry
- Check analytics in PostHog
- Verify database backups running
- Test critical user flows

---

## Component API Reference

### BrainStatus
```typescript
<BrainStatus 
  status={{
    status: 'enriching',
    action: 'Synthesizing content',
    progress: 2,
    totalStages: 5,
    estimatedCompletion: '2026-04-30T12:00:00Z',
    stats: {
      contentGenerated: 5,
      postsPublished: 2,
      commentsProcessed: 12,
    }
  }}
/>
```

### QuickStart
```typescript
<QuickStart userId={userId} />
```

### ContentPipeline
```typescript
<ContentPipeline fullView={false} />
```

### MultiPlatformManager
```typescript
<MultiPlatformManager userId={userId} />
```

### GhostReplyEngine
```typescript
<GhostReplyEngine userId={userId} />
```

### AgenticLogTerminal
```typescript
<AgenticLogTerminal userId={userId} />
```

---

## API Response Patterns

### Success Response
```json
{
  "data": { "id": "123", "name": "Example" },
  "status": 200
}
```

### Error Response
```json
{
  "error": "descriptive error message",
  "status": 400
}
```

### List Response
```json
[
  { "id": "1", "name": "Item 1" },
  { "id": "2", "name": "Item 2" }
]
```

---

## Useful Commands

```bash
# Format code
pnpm format

# Lint
pnpm lint

# Type check
pnpm type-check

# Run tests
pnpm test

# Build
pnpm build

# Analyze bundle
pnpm analyze

# Generate Supabase types
supabase gen types typescript --local > types/database.ts
```

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Claude API Docs](https://docs.anthropic.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Framer Motion](https://www.framer.com/motion)

---

**Version**: 1.0  
**Last Updated**: April 30, 2026

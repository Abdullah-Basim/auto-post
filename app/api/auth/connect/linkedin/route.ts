import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { env, hasLinkedInOAuth } from '@/lib/env'

/**
 * GET /api/auth/connect/linkedin
 * Starts the LinkedIn OAuth flow.
 *
 * Required scopes:
 *   - openid, profile, email     (Sign In with LinkedIn v2)
 *   - w_member_social            (post on behalf of user)
 *   - r_organization_social      (read org posts) — optional
 *
 * State param is cryptographically random and pinned to a cookie so we can
 * detect CSRF on the callback.
 */
export async function GET() {
  if (!hasLinkedInOAuth()) {
    return NextResponse.json(
      { error: 'LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID/SECRET.' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = crypto.randomBytes(16).toString('hex')

  const jar = await cookies()
  jar.set('li_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.LINKEDIN_CLIENT_ID!,
    redirect_uri:
      env.LINKEDIN_REDIRECT_URI ?? `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/linkedin`,
    state,
    scope: 'openid profile email w_member_social',
  })

  return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
}
